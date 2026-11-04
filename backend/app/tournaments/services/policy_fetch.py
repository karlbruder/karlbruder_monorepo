"""Fetch bounded public policy documents without trusting a second DNS lookup."""

import http.client
import ipaddress
import socket
import ssl
import time
from queue import Queue, Empty
from threading import BoundedSemaphore, Thread, Timer
from dataclasses import dataclass
from urllib.parse import SplitResult, urljoin, urlsplit

from app.tournaments.exceptions import PolicyArchiveError

MAX_POLICY_BYTES = 10 * 1024 * 1024
FETCH_TIMEOUT_SECONDS = 10
MAX_REDIRECTS = 3
_DNS_SLOTS = BoundedSemaphore(4)
_ALLOWED_TYPES = {"application/pdf", "text/plain", "text/html"}


@dataclass(frozen=True)
class FetchedPolicy:
    body: bytes
    content_type: str
    final_url: str


def _remaining(deadline: float) -> float:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise PolicyArchiveError("Policy download timed out")
    return remaining


def _public_addresses(host: str, port: int, deadline: float) -> list[str]:
    # getaddrinfo has no timeout. Bound both caller wait and outstanding resolver threads.
    if not _DNS_SLOTS.acquire(blocking=False):
        raise PolicyArchiveError("Policy DNS resolver is busy")
    result = Queue(maxsize=1)

    def resolve():
        try:
            result.put(socket.getaddrinfo(host, port, type=socket.SOCK_STREAM))
        except OSError as error:
            result.put(error)
        finally:
            _DNS_SLOTS.release()

    Thread(target=resolve, daemon=True).start()
    try:
        resolved = result.get(timeout=_remaining(deadline))
    except Empty as error:
        raise PolicyArchiveError("Policy DNS lookup timed out") from error
    if isinstance(resolved, OSError):
        raise resolved
    addresses = list(dict.fromkeys(item[4][0] for item in resolved))
    if not addresses or any(
        not ipaddress.ip_address(address).is_global
        or ipaddress.ip_address(address).is_multicast
        for address in addresses
    ):
        raise PolicyArchiveError("Policy URL must resolve only to public addresses")
    return addresses


def _connect(parsed: SplitResult, deadline: float) -> http.client.HTTPConnection:
    host = parsed.hostname
    if (
        parsed.scheme not in {"http", "https"}
        or not host
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        raise PolicyArchiveError(
            "Policy URL must be an HTTP(S) document without credentials or a fragment"
        )
    if any(ord(char) <= 32 or ord(char) == 127 for char in parsed.geturl()):
        raise PolicyArchiveError("Invalid policy URL")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    addresses = _public_addresses(host, port, deadline)
    _remaining(deadline)
    connection = (
        http.client.HTTPSConnection(
            host,
            port,
            timeout=_remaining(deadline),
            context=ssl.create_default_context(),
        )
        if parsed.scheme == "https"
        else http.client.HTTPConnection(host, port, timeout=_remaining(deadline))
    )

    # Preserve Host and TLS SNI/certificate checks, but connect only to a checked IP.
    def pinned_socket(_address, timeout, source_address=None):
        return socket.create_connection((addresses[0], port), timeout, source_address)

    connection._create_connection = pinned_socket
    try:
        connection.connect()
        connection.sock.settimeout(_remaining(deadline))
        return connection
    except (OSError, ValueError, PolicyArchiveError):
        connection.close()
        raise


class PolicyFetcher:
    def fetch(self, url: str) -> FetchedPolicy:
        deadline = time.monotonic() + FETCH_TIMEOUT_SECONDS
        try:
            for redirects in range(MAX_REDIRECTS + 1):
                parsed = urlsplit(url)
                connection = _connect(parsed, deadline)
                timer = None
                try:
                    connected_socket = connection.sock

                    def abort():
                        try:
                            connected_socket.shutdown(socket.SHUT_RDWR)
                        except OSError:
                            pass

                    timer = Timer(_remaining(deadline), abort)
                    timer.daemon = True
                    timer.start()
                    target = parsed.path or "/"
                    if parsed.query:
                        target += f"?{parsed.query}"
                    connection.request(
                        "GET",
                        target,
                        headers={
                            "Accept-Encoding": "identity",
                            "Accept": ", ".join(sorted(_ALLOWED_TYPES)),
                        },
                    )
                    response = connection.getresponse()
                    _remaining(deadline)
                    if response.status in {301, 302, 303, 307, 308}:
                        location = response.getheader("Location")
                        if not location or redirects == MAX_REDIRECTS:
                            raise PolicyArchiveError("Policy redirect limit exceeded")
                        url = urljoin(url, location)
                        continue
                    if response.status != 200:
                        raise PolicyArchiveError("Policy download was unsuccessful")
                    content_type = (
                        (response.getheader("Content-Type") or "")
                        .split(";", 1)[0]
                        .strip()
                        .lower()
                    )
                    if content_type not in _ALLOWED_TYPES:
                        raise PolicyArchiveError(
                            "Policy must be PDF, plain text or HTML"
                        )
                    if (
                        response.getheader("Content-Encoding") or "identity"
                    ).lower() != "identity":
                        raise PolicyArchiveError(
                            "Compressed policy responses are not supported"
                        )
                    length = response.getheader("Content-Length")
                    if length and int(length) > MAX_POLICY_BYTES:
                        raise PolicyArchiveError("Policy exceeds 10 MiB")
                    chunks = []
                    size = 0
                    while True:
                        if connection.sock:
                            connection.sock.settimeout(_remaining(deadline))
                        # read1 returns after one underlying read so slow streams cannot reset the total budget.
                        chunk = response.read1(min(65536, MAX_POLICY_BYTES + 1 - size))
                        _remaining(deadline)
                        if not chunk:
                            break
                        chunks.append(chunk)
                        size += len(chunk)
                        if size > MAX_POLICY_BYTES:
                            raise PolicyArchiveError("Policy exceeds 10 MiB")
                    body = b"".join(chunks)
                    if not body or (length and len(body) != int(length)):
                        raise PolicyArchiveError(
                            "Policy download was empty or incomplete"
                        )
                    if content_type == "application/pdf" and not body.startswith(
                        b"%PDF-"
                    ):
                        raise PolicyArchiveError(
                            "Policy content does not match PDF type"
                        )
                    return FetchedPolicy(body, content_type, url)
                finally:
                    if timer is not None:
                        timer.cancel()
                    connection.close()
        except (OSError, ValueError, http.client.HTTPException) as error:
            raise PolicyArchiveError("Policy document could not be archived") from error
        raise PolicyArchiveError("Policy document could not be archived")


def get_policy_fetcher() -> PolicyFetcher:
    return PolicyFetcher()
