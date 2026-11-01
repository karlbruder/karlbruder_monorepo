import argparse
import http.client
import json
import os
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
    for name in ("APPLICATION_BASE_URL", "LANDING_BASE_URL", "SERVICES", "RELEASED_AT", "RELEASE_SHA"):
        parser.add_argument(f"--{name.lower().replace(chr(95), chr(45))}", default=os.environ.get(name))
    args = parser.parse_args(argv)
    for name in (("APPLICATION_BASE_URL", "LANDING_BASE_URL", "SERVICES", "RELEASED_AT", "RELEASE_SHA")):
        if getattr(args, name.lower()) is None:
            parser.error(f"{name} is required as an argument or environment variable")
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
                f"backend git_sha {data.get('git_sha')} does not match {os.environ['RELEASE_SHA']}"
            )


if __name__ == "__main__":
    main()
