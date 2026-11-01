import argparse
import http.client
import json
import time
from urllib.error import URLError
from urllib.request import urlopen


def request_with_retries(url):
    """Fetch a public URL, retrying temporary request failures."""
    for attempt in range(7):
        try:
            with urlopen(url, timeout=20) as response:
                return response.read()
        except (URLError, OSError, http.client.HTTPException) as error:
            if attempt == 6:
                raise SystemExit(f"Request failed for {url}: {error}") from error
            time.sleep(5)


def main(argv=None):
    """Check public endpoints and expected backend release metadata."""
    parser = argparse.ArgumentParser(description=main.__doc__)
    parser.add_argument("--application-base-url", required=True)
    parser.add_argument("--landing-base-url", required=True)
    parser.add_argument("--services", required=True)
    parser.add_argument("--released-at", required=True)
    parser.add_argument("--release-sha", required=True)
    args = parser.parse_args(argv)
    application_url = args.application_base_url
    request_with_retries(args.landing_base_url)
    request_with_retries(application_url)
    request_with_retries(f"{application_url}/api/health")
    data = json.loads(request_with_retries(f"{application_url}/api/metadata"))
    if not data.get("released_at"):
        raise SystemExit(f"metadata is missing released_at: {data}")
    if "backend" in json.loads(args.services):
        if data.get("released_at") != args.released_at:
            raise SystemExit("backend released_at does not match the pipeline build time")
        if data.get("git_sha") != args.release_sha:
            raise SystemExit(
                f"backend git_sha {data.get('git_sha')} does not match {args.release_sha}"
            )


if __name__ == "__main__":
    main()
