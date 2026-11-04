"""Policy captures bound network access and never follow unchecked destinations."""

from io import BytesIO
from unittest.mock import Mock

import pytest

from app.tournaments.exceptions import PolicyArchiveError
from app.tournaments.services import policy_fetch


class Response:
    def __init__(self, body=b"%PDF-1.4 fixture", status=200, **headers):
        self.status = status
        self.headers = {"Content-Type": "application/pdf", **headers}
        self.body = BytesIO(body)

    def getheader(self, name):
        return self.headers.get(name)

    def read1(self, count):
        return self.body.read(count)


@pytest.fixture
def network(monkeypatch):
    connections = []
    responses = [Response()]
    socket = Mock()
    dial = Mock(return_value=socket)
    monkeypatch.setattr(policy_fetch.socket, "create_connection", dial)
    monkeypatch.setattr(
        policy_fetch.socket,
        "getaddrinfo",
        lambda host, port, **kwargs: [
            (
                2,
                1,
                6,
                "",
                (
                    "93.184.216.34" if host == "public.example.test" else "127.0.0.1",
                    port,
                ),
            )
        ],
    )

    class Connection:
        def __init__(self, host, port, **kwargs):
            self.host, self.port, self.options = host, port, kwargs
            self.sock = None
            self.requests = []
            self.closed = False
            connections.append(self)

        def connect(self):
            self.sock = self._create_connection(
                (self.host, self.port), self.options["timeout"]
            )

        def request(self, method, path, headers):
            self.requests.append((method, path, headers))

        def getresponse(self):
            return responses.pop(0)

        def close(self):
            self.closed = True

    monkeypatch.setattr(policy_fetch.http.client, "HTTPConnection", Connection)
    monkeypatch.setattr(policy_fetch.http.client, "HTTPSConnection", Connection)
    return connections, responses, dial


def test_fetch_pins_checked_ip_preserves_tls_host_and_sends_no_credentials(network):
    connections, _responses, dial = network
    result = policy_fetch.PolicyFetcher().fetch(
        "https://public.example.test/policy?version=1"
    )
    assert result.body == b"%PDF-1.4 fixture"
    assert result.final_url == "https://public.example.test/policy?version=1"
    assert dial.call_args.args[0] == ("93.184.216.34", 443)
    assert connections[0].host == "public.example.test"
    assert connections[0].options["context"].check_hostname is True
    assert connections[0].requests == [
        (
            "GET",
            "/policy?version=1",
            {
                "Accept-Encoding": "identity",
                "Accept": "application/pdf, text/html, text/plain",
            },
        )
    ]
    assert connections[0].closed


@pytest.mark.parametrize(
    "url",
    [
        "https://private.example.test/policy",
        "https://user:secret@public.example.test/policy",
        "file:///etc/passwd",
        "http://public.example.test/path\nHost: injected",
    ],
)
def test_fetch_rejects_private_credentials_and_invalid_urls_before_connect(
    network, url
):
    with pytest.raises(PolicyArchiveError):
        policy_fetch.PolicyFetcher().fetch(url)
    assert not network[2].called


def test_redirect_to_private_destination_is_rejected(network):
    connections, responses, dial = network
    responses[:] = [Response(status=302, Location="http://private.example.test/policy")]
    with pytest.raises(PolicyArchiveError, match="public addresses"):
        policy_fetch.PolicyFetcher().fetch("https://public.example.test/start")
    assert dial.call_count == 1
    assert connections[0].closed


def test_redirects_are_bounded_and_preserve_final_url(network):
    connections, responses, _dial = network
    responses[:] = [
        Response(status=302, Location="/final"),
        Response(b"hello", **{"Content-Type": "text/plain"}),
    ]
    assert (
        policy_fetch.PolicyFetcher()
        .fetch("https://public.example.test/start")
        .final_url
        == "https://public.example.test/final"
    )
    responses[:] = [Response(status=302, Location="/again") for _ in range(4)]
    with pytest.raises(PolicyArchiveError, match="redirect limit"):
        policy_fetch.PolicyFetcher().fetch("https://public.example.test/start")
    assert all(connection.closed for connection in connections)


@pytest.mark.parametrize(
    "response",
    [
        Response(status=503),
        Response(b""),
        Response(**{"Content-Type": "image/png"}),
        Response(**{"Content-Encoding": "gzip"}),
        Response(b"not a pdf"),
        Response(**{"Content-Length": "999999999"}),
        Response(**{"Content-Length": "999"}),
    ],
)
def test_fetch_rejects_unavailable_empty_unsupported_compressed_and_incomplete_content(
    network, response
):
    network[1][:] = [response]
    with pytest.raises(PolicyArchiveError):
        policy_fetch.PolicyFetcher().fetch("https://public.example.test/policy")
    assert network[0][0].closed


def test_stream_limit_applies_without_a_content_length(network, monkeypatch):
    monkeypatch.setattr(policy_fetch, "MAX_POLICY_BYTES", 32)
    network[1][:] = [Response(b"a" * 33, **{"Content-Type": "text/plain"})]
    with pytest.raises(PolicyArchiveError, match="exceeds"):
        policy_fetch.PolicyFetcher().fetch("https://public.example.test/policy")


def test_dns_deadline_returns_without_waiting_for_stalled_resolver(monkeypatch):
    import time
    from threading import Event

    release = Event()
    monkeypatch.setattr(
        policy_fetch.socket, "getaddrinfo", lambda *args, **kwargs: release.wait(1)
    )
    start = time.monotonic()
    try:
        with pytest.raises(PolicyArchiveError, match="DNS lookup timed out"):
            policy_fetch._public_addresses("public.example.test", 443, start + 0.01)
        assert time.monotonic() - start < 0.5
    finally:
        release.set()


def test_elapsed_total_deadline_rejects_a_slow_stream(network, monkeypatch):
    import time

    response = Response(b"%PDF-1.4 fixture")
    read = response.read1

    def slow(count):
        time.sleep(0.02)
        return read(count)

    response.read1 = slow
    network[1][:] = [response]
    monkeypatch.setattr(policy_fetch, "FETCH_TIMEOUT_SECONDS", 0.01)
    with pytest.raises(PolicyArchiveError, match="timed out"):
        policy_fetch.PolicyFetcher().fetch("https://public.example.test/policy")


@pytest.mark.parametrize("address", ["127.0.0.1", "169.254.169.254", "10.1.2.3", "::1", "fe80::1", "224.0.0.1", "ff02::1"])
def test_dns_rejects_nonpublic_and_multicast_answers_even_alongside_a_public_ip(monkeypatch, address):
    import time
    monkeypatch.setattr(policy_fetch.socket, "getaddrinfo", lambda *args, **kwargs: [
        (2, 1, 6, "", ("93.184.216.34", 443)),
        (2, 1, 6, "", (address, 443)),
    ])
    with pytest.raises(PolicyArchiveError, match="public addresses"):
        policy_fetch._public_addresses("public.example.test", 443, time.monotonic() + 1)
