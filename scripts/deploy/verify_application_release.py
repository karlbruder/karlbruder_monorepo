import argparse
import http.client
import json
import os
import time
from urllib.error import URLError
from urllib.request import Request, urlopen


def request_with_retries(url, health_check_secret):
    """Fetch a public URL, retrying temporary request failures."""
    for attempt in range(7):
        try:
            request = Request(url, headers={"x-health-check": health_check_secret})
            with urlopen(request, timeout=20) as response:
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
    health_check_secret = os.environ.get("CLOUDFLARE_HEALTH_CHECK_SECRET")
    if not health_check_secret:
        raise SystemExit("CLOUDFLARE_HEALTH_CHECK_SECRET is required")
    application_url = args.application_base_url
    request_with_retries(args.landing_base_url, health_check_secret)
    request_with_retries(application_url, health_check_secret)
    request_with_retries(f"{application_url}/api/health", health_check_secret)
    data = json.loads(request_with_retries(f"{application_url}/api/metadata", health_check_secret))
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
