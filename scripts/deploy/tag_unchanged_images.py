import argparse
import json
import os
from common import run_captured_command


def main(argv=None):
    """Tag unchanged ECR images with the current release SHA."""
    parser = argparse.ArgumentParser(description=main.__doc__)
    for name in ("AWS_REGION", "DEPLOY_ENVIRONMENT", "RELEASE_SHA", "SERVICES"):
        parser.add_argument(f"--{name.lower().replace(chr(95), chr(45))}", default=os.environ.get(name))
    args = parser.parse_args(argv)
    for name in (("AWS_REGION", "DEPLOY_ENVIRONMENT", "RELEASE_SHA", "SERVICES")):
        if getattr(args, name.lower()) is None:
            parser.error(f"{name} is required as an argument or environment variable")
    region = args.aws_region
    namespace = f"kb-{args.deploy_environment}"
    release_sha = args.release_sha
    environment_tag = args.deploy_environment
    built = set(json.loads(args.services))
    services = ["backend", "frontend", "landing", "nginx"]

    for service in services:
        if service in built:
            continue
        repository = f"{namespace}/{service}"
        existing = run_captured_command(
            "aws", "ecr", "describe-images",
            "--region", region,
            "--repository-name", repository,
            "--image-ids", f"imageTag={release_sha}",
        )
        if existing.returncode == 0:
            continue
        image = run_captured_command(
            "aws", "ecr", "batch-get-image",
            "--region", region,
            "--repository-name", repository,
            "--image-ids", f"imageTag={environment_tag}",
            "--output", "json",
        )
        if image.returncode != 0:
            raise SystemExit(image.stderr or image.stdout)
        payload = json.loads(image.stdout)
        images = payload.get("images") or []
        manifest = images[0].get("imageManifest") if images else ""
        if not manifest:
            raise SystemExit(
                f"{repository}:{environment_tag} does not exist. "
                f"Build {service} once before deploying it by release SHA."
            )
        copied = run_captured_command(
            "aws", "ecr", "put-image",
            "--region", region,
            "--repository-name", repository,
            "--image-tag", release_sha,
            "--image-manifest", manifest,
        )
        if copied.returncode != 0 and "ImageAlreadyExistsException" not in copied.stderr:
            raise SystemExit(copied.stderr or copied.stdout)


if __name__ == "__main__":
    main()
