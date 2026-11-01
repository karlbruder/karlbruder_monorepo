"""Command runners shared by the standalone deployment scripts."""

import json
import subprocess


def run_checked_command(*args, **kwargs):
    """Run a command and stop if it fails."""
    return subprocess.run(args, check=True, text=True, **kwargs)


def run_captured_command(*args):
    """Run a command and return its output and exit status."""
    return subprocess.run(args, check=False, capture_output=True, text=True)


def run_aws_json_command(*args, region, check=True):
    """Run an AWS CLI command and parse its JSON response."""
    result = run_captured_command("aws", *args, "--region", region, "--output", "json")
    if result.returncode:
        if check:
            raise SystemExit(result.stderr or result.stdout)
        return {}
    return json.loads(result.stdout)
