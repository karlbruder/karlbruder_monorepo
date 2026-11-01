import argparse
import base64
import grp
import os
from pathlib import Path

from common import run_checked_command


def main(argv=None):
    """Replace the application stack on this host and verify its images."""
    parser = argparse.ArgumentParser(description=main.__doc__)
    parser.add_argument("--aws-region", required=True)
    parser.add_argument("--aws-account-id", required=True)
    parser.add_argument("--namespace", required=True)
    parser.add_argument("--release-sha", required=True)
    parser.add_argument("--deploy-path", required=True)
    parser.add_argument("--landing-hostnames", required=True)
    parser.add_argument("--application-hostnames", required=True)
    parser.add_argument("--compose-file", type=Path, default=Path("compose.production.yml"))
    parser.add_argument("--compose-content-b64")
    args = parser.parse_args(argv)
    config = {
        "AWS_REGION": args.aws_region,
        "AWS_ACCOUNT_ID": args.aws_account_id,
        "NAMESPACE": args.namespace,
        "RELEASE_SHA": args.release_sha,
        "DEPLOY_PATH": args.deploy_path,
        "LANDING_HOSTNAMES": args.landing_hostnames,
        "APPLICATION_HOSTNAMES": args.application_hostnames,
    }
    config["compose"] = base64.b64decode(args.compose_content_b64).decode() if args.compose_content_b64 else args.compose_file.read_text()
    run_checked_command("docker", "--version")
    run_checked_command("docker", "compose", "version")
    deploy_path = Path(config["DEPLOY_PATH"])
    deploy_path.mkdir(parents=True, exist_ok=True)
    compose_file = deploy_path / "compose.production.yml"
    compose_file.write_text(config["compose"])
    os.chown(compose_file, 0, grp.getgrnam("docker").gr_gid)
    compose_file.chmod(0o664)
    os.chdir(deploy_path)

    env = dict(os.environ)
    for name in ("AWS_ACCOUNT_ID", "AWS_REGION", "NAMESPACE"):
        env[name] = config[name]
    env["IMAGE_TAG"] = config["RELEASE_SHA"]
    env["LANDING_HOSTNAMES"] = config["LANDING_HOSTNAMES"]
    env["APPLICATION_HOSTNAMES"] = config["APPLICATION_HOSTNAMES"]

    region = config["AWS_REGION"]
    registry = f"{config['AWS_ACCOUNT_ID']}.dkr.ecr.{region}.amazonaws.com"
    password = run_checked_command("aws", "ecr", "get-login-password", "--region", region, capture_output=True).stdout
    run_checked_command("docker", "login", "--username", "AWS", "--password-stdin", registry, input=password)

    compose = ("docker", "compose", "-f", "compose.production.yml")
    run_checked_command(*compose, "pull", env=env)
    run_checked_command(*compose, "up", "-d", "--wait", env=env)
    run_checked_command(*compose, "up", "-d", "--no-deps", "--force-recreate", "--wait", "nginx", env=env)
    for service in ("backend", "frontend", "landing", "nginx"):
        container = run_checked_command(*compose, "ps", "-q", service, env=env, capture_output=True).stdout.strip()
        image = run_checked_command("docker", "inspect", "--format", "{{.Config.Image}}", container, capture_output=True).stdout.strip()
        if not image.endswith(f":{config['RELEASE_SHA']}"):
            raise SystemExit(f"unexpected {service} image {image}")
    run_checked_command("docker", "image", "prune", "-f")


if __name__ == "__main__":
    main()
