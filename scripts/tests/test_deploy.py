import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from urllib.error import URLError


ROOT = Path(__file__).resolve().parents[1] / 'deploy'
sys.path.insert(0, str(ROOT))


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


common = load('common')
deploy = load('deploy_application')
host = load('update_application_host')
verify = load('verify_application_release')
stamp = load('tag_unchanged_images')
CONFIG = {
    'AWS_REGION': 'us-east-2', 'AWS_ACCOUNT_ID': '123456789012',
    'NAMESPACE': 'kb-dev', 'RELEASE_SHA': 'test-sha',
    'DEPLOY_PATH': '/opt/karlbruder', 'DEPLOY_ENVIRONMENT': 'dev',
    'HOST_NAME_TAG': 'kb-dev-application-host',
    'LANDING_HOSTNAMES': 'dev.karlbruder.com',
    'APPLICATION_HOSTNAMES': 'app-dev.karlbruder.com',
    'ENV_NAME': 'dev',
}


def cli_args(source, *names):
    arguments = []
    for name in names:
        arguments.extend((f"--{name.lower().replace('_', '-')}", source[name]))
    return arguments


DEPLOY_ARGUMENT_NAMES = (
    'AWS_REGION', 'AWS_ACCOUNT_ID', 'NAMESPACE', 'RELEASE_SHA', 'DEPLOY_PATH',
    'HOST_NAME_TAG', 'LANDING_HOSTNAMES', 'APPLICATION_HOSTNAMES', 'ENV_NAME',
)
HOST_ARGUMENT_NAMES = (
    'AWS_REGION', 'AWS_ACCOUNT_ID', 'NAMESPACE', 'RELEASE_SHA', 'DEPLOY_PATH',
    'LANDING_HOSTNAMES', 'APPLICATION_HOSTNAMES', 'ENV_NAME',
)


class DeploymentTests(unittest.TestCase):
    def run_deploy(self, responses):
        with patch.object(deploy, 'run_aws_json_command', side_effect=responses) as aws, patch.object(deploy.time, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            deploy.main(cli_args(CONFIG, *DEPLOY_ARGUMENT_NAMES))
        return aws

    def test_pending_command_is_polled_until_success(self):
        aws = self.run_deploy(['i-test', 'command-test', {}, {'Status': 'Pending'}, {'Status': 'Success', 'StandardOutputContent': 'done'}])
        self.assertEqual(aws.call_count, 5)
        payload = json.loads(aws.call_args_list[1].args[3])
        self.assertEqual(payload['InstanceIds'], ['i-test'])
        command = shlex.split(payload['Parameters']['commands'][0])
        self.assertEqual(command[:2], ['python3', '-c'])
        self.assertIn('--release-sha', command)
        self.assertIn('test-sha', command)
        self.assertIn('--compose-content-b64', command)

    def test_missing_host_stops_before_sending_command(self):
        with self.assertRaisesRegex(SystemExit, 'No running instance'):
            self.run_deploy([None])

    def test_terminal_failures_report_remote_error(self):
        for status in ('Failed', 'Cancelled', 'TimedOut', 'Cancelling'):
            with self.subTest(status=status), self.assertRaisesRegex(SystemExit, 'remote error'):
                self.run_deploy(['i-test', 'command-test', {'Status': status, 'StandardErrorContent': 'remote error'}])

    def test_polling_stops_after_timeout(self):
        with self.assertRaisesRegex(SystemExit, 'did not finish'):
            self.run_deploy(['i-test', 'command-test'] + [{'Status': 'Pending'}] * 90)

    def test_aws_errors_fail_except_during_polling(self):
        result = subprocess.CompletedProcess([], 1, '', 'AWS failure')
        with patch.object(common.subprocess, 'run', return_value=result):
            with self.assertRaisesRegex(SystemExit, 'AWS failure'):
                deploy.run_aws_json_command('ssm', 'send-command', region='us-east-2')
            self.assertEqual(deploy.run_aws_json_command('ssm', 'get-command-invocation', region='us-east-2', check=False), {})

    def run_host(self, environment, image):
        def command(*args, **kwargs):
            if args[:3] == ('aws', 'ecr', 'get-login-password'):
                return Mock(stdout='test-password')
            if args[:2] == ('docker', 'inspect'):
                return Mock(stdout=image)
            return Mock(stdout='container-test')

        with tempfile.TemporaryDirectory() as folder, patch.object(host, 'run_checked_command', side_effect=command) as run, patch.object(host.os, 'chown'), patch.object(host.os, 'chdir'), patch.object(host.grp, 'getgrnam', return_value=Mock(gr_gid=1000)):
            Path(folder, 'source.yml').write_text('services: {}')
            source = dict(CONFIG, DEPLOY_PATH=folder, APPLICATION_HOSTNAMES='app.karlbruder.com app-prod.karlbruder.com' if environment == 'prod' else 'app-dev.karlbruder.com')
            host.main([*cli_args(source, *HOST_ARGUMENT_NAMES), '--compose-file', str(Path(folder, 'source.yml'))])
            self.assertEqual(Path(folder, 'compose.production.yml').read_text(), 'services: {}')
            self.assertEqual(
                Path(folder, 'backend.env').read_text(),
                'ENV_NAME=dev\nSECRET_NAME=kb-dev/backend\nAWS_REGION=us-east-2\n',
            )
        return run

    def test_host_sets_routing_and_verifies_all_images_before_pruning(self):
        for environment, hostname in [('dev', 'app-dev.karlbruder.com'), ('prod', 'app.karlbruder.com app-prod.karlbruder.com')]:
            with self.subTest(environment=environment):
                run = self.run_host(environment, 'registry/service:test-sha')
                pull = next(call for call in run.call_args_list if call.args[-1] == 'pull')
                self.assertEqual(pull.kwargs['env']['APPLICATION_HOSTNAMES'], hostname)
                self.assertEqual(sum(call.args[:2] == ('docker', 'inspect') for call in run.call_args_list), 4)
                self.assertEqual(run.call_args.args, ('docker', 'image', 'prune', '-f'))

    def test_host_rejects_wrong_image(self):
        with self.assertRaisesRegex(SystemExit, 'unexpected backend image'):
            self.run_host('dev', 'registry/backend:wrong')


class VerificationTests(unittest.TestCase):
    def test_metadata_checks_new_backend_and_accepts_reused_backend(self):
        source = dict(CONFIG, APPLICATION_BASE_URL='https://app.invalid', LANDING_BASE_URL='https://landing.invalid', RELEASED_AT='build-time')
        for services, sha, released, passed in [
            ('["backend"]', 'test-sha', 'build-time', True),
            ('["backend"]', 'wrong', 'build-time', False),
            ('["backend"]', 'test-sha', 'wrong', False),
            ('["landing"]', 'old', 'old', True),
            ('["landing"]', 'old', '', False),
        ]:
            arguments = cli_args(dict(source, SERVICES=services), 'APPLICATION_BASE_URL', 'LANDING_BASE_URL', 'SERVICES', 'RELEASED_AT', 'RELEASE_SHA')
            with self.subTest(services=services, sha=sha, released=released), patch.dict(verify.os.environ, CLOUDFLARE_HEALTH_CHECK_SECRET='test-secret'), patch.object(verify, 'request_with_retries', return_value=json.dumps({'git_sha': sha, 'released_at': released})) as request:
                if passed:
                    verify.main(arguments)
                else:
                    with self.assertRaises(SystemExit):
                        verify.main(arguments)
                self.assertEqual(request.call_args_list, [
                    unittest.mock.call(url, 'test-secret') for url in [
                        'https://landing.invalid', 'https://app.invalid',
                        'https://app.invalid/api/health', 'https://app.invalid/api/metadata',
                    ]
                ])

    def test_http_failure_retries_then_returns_success(self):
        response = Mock()
        response.__enter__ = Mock(return_value=Mock(read=Mock(return_value=b'ok')))
        response.__exit__ = Mock(return_value=False)
        with patch.object(verify, 'urlopen', side_effect=[URLError('offline'), response]) as request, patch.object(verify.time, 'sleep') as sleep:
            self.assertEqual(verify.request_with_retries('https://app.invalid', 'test-secret'), b'ok')
            self.assertEqual(request.call_count, 2)
            for attempt in request.call_args_list:
                self.assertEqual(attempt.args[0].get_header('X-health-check'), 'test-secret')
            sleep.assert_called_once_with(5)

    def test_http_failure_stops_after_seven_attempts(self):
        with patch.object(verify, 'urlopen', side_effect=URLError('offline')) as request, patch.object(verify.time, 'sleep'), self.assertRaisesRegex(SystemExit, 'Request failed'):
            try:
                verify.request_with_retries('https://app.invalid', 'test-secret')
            finally:
                self.assertEqual(request.call_count, 7)

    def test_stamping_reuses_manifest_for_unbuilt_service(self):
        results = [subprocess.CompletedProcess([], 1, '', ''), subprocess.CompletedProcess([], 0, '{"images":[{"imageManifest":"manifest"}]}', ''), subprocess.CompletedProcess([], 0, '', '')]
        with patch.object(common.subprocess, 'run', side_effect=results) as run:
            stamp.main(cli_args(dict(CONFIG, SERVICES='["backend","frontend","landing"]'), 'AWS_REGION', 'DEPLOY_ENVIRONMENT', 'RELEASE_SHA', 'SERVICES'))
            self.assertIn('kb-dev/nginx', run.call_args.args[0])
            self.assertIn('manifest', run.call_args.args[0])


if __name__ == '__main__':
    unittest.main()
