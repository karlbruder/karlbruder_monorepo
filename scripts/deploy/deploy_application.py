import argparse
import base64
import json
from pathlib import Path
import shlex
import time

from common import run_aws_json_command



def main(argv=None):
    """Send the application release to a running host through AWS SSM."""
    parser = argparse.ArgumentParser(description=main.__doc__)
    parser.add_argument("--aws-region", required=True)
    parser.add_argument("--aws-account-id", required=True)
    parser.add_argument("--namespace", required=True)
    parser.add_argument("--release-sha", required=True)
    parser.add_argument("--deploy-path", required=True)
    parser.add_argument("--host-name-tag", required=True)
    parser.add_argument("--landing-hostnames", required=True)
    parser.add_argument("--application-hostnames", required=True)
    parser.add_argument("--env-name", required=True)
    parser.add_argument("--compose-file", type=Path, default=Path("compose.production.yml"))
    args = parser.parse_args(argv)
    config = {
        "AWS_REGION": args.aws_region,
        "AWS_ACCOUNT_ID": args.aws_account_id,
        "NAMESPACE": args.namespace,
        "RELEASE_SHA": args.release_sha,
        "DEPLOY_PATH": args.deploy_path,
        "LANDING_HOSTNAMES": args.landing_hostnames,
        "APPLICATION_HOSTNAMES": args.application_hostnames,
        "ENV_NAME": args.env_name,
    }
    host_name = args.host_name_tag
    instance_id = run_aws_json_command(
        "ec2", "describe-instances", "--filters",
        f"Name=tag:Name,Values={host_name}", "Name=instance-state-name,Values=running",
        "--query", "Reservations[0].Instances[0].InstanceId", region=args.aws_region,
    )
    if not instance_id:
        raise SystemExit(f"No running instance with Name {host_name}.")

    config["compose"] = args.compose_file.read_text()
    script = Path(__file__).with_name("update_application_host.py").read_text()
    encoded = base64.b64encode(script.encode()).decode()
    common = Path(__file__).with_name("common.py").read_text()
    encoded_common = base64.b64encode(common.encode()).decode()
    launcher = (
        "import base64, sys, types; "
        "common = types.ModuleType('common'); "
        f"exec(base64.b64decode({encoded_common!r}), common.__dict__); "
        "sys.modules['common'] = common; "
        f"exec(base64.b64decode({encoded!r}))"
    )
    host_args = ["--compose-content-b64", base64.b64encode(config.pop("compose").encode()).decode()]
    for name, value in config.items():
        host_args.extend((f"--{name.lower().replace(chr(95), chr(45))}", value))
    command = " ".join(shlex.quote(part) for part in ["python3", "-c", launcher, *host_args])
    payload = {
        "DocumentName": "AWS-RunShellScript",
        "InstanceIds": [instance_id],
        "TimeoutSeconds": 900,
        "Comment": f"karlbruder deploy {config['RELEASE_SHA']}",
        "Parameters": {"commands": [command]},
    }
    command_id = run_aws_json_command(
        "ssm", "send-command", "--cli-input-json", json.dumps(payload),
        "--query", "Command.CommandId", region=args.aws_region,
    )
    print(f"Session Manager command {command_id} on {instance_id}", flush=True)
    for _ in range(90):
        result = run_aws_json_command(
            "ssm", "get-command-invocation", "--command-id", command_id,
            "--instance-id", instance_id, region=args.aws_region, check=False,
        )
        status = result.get("Status")
        if status == "Success":
            print(result.get("StandardOutputContent", ""))
            return
        if status in {"Failed", "Cancelled", "TimedOut", "Cancelling"}:
            raise SystemExit(
                f"Session Manager command {status}.\n{result.get('StandardErrorContent', '')}"
            )
        time.sleep(10)
    raise SystemExit(f"Session Manager command {command_id} did not finish.")


if __name__ == "__main__":
    main()
