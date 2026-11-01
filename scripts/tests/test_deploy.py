import contextlib
import importlib.util
import io
import json
import os
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
    'LANDING_SERVER_NAMES': 'dev.karlbruder.com',
    'APP_SERVER_NAMES': 'app-dev.karlbruder.com',
}


class DeploymentTests(unittest.TestCase):
    def run_deploy(self, responses):
        with patch.dict(os.environ, CONFIG), patch.object(deploy, 'run_aws_json_command', side_effect=responses) as aws, patch.object(deploy.time, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            deploy.main([])
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
        with patch.dict(os.environ, CONFIG), patch.object(common.subprocess, 'run', return_value=result):
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

        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, CONFIG), patch.object(host, 'run_checked_command', side_effect=command) as run, patch.object(host.os, 'chown'), patch.object(host.os, 'chdir'), patch.object(host.grp, 'getgrnam', return_value=Mock(gr_gid=1000)):
            Path(folder, 'source.yml').write_text('services: {}')
            host.main(['--deploy-path', folder, '--compose-file', str(Path(folder, 'source.yml')), '--app-server-names', 'app.karlbruder.com app-prod.karlbruder.com' if environment == 'prod' else 'app-dev.karlbruder.com'])
            self.assertEqual(Path(folder, 'compose.production.yml').read_text(), 'services: {}')
        return run

    def test_host_sets_routing_and_verifies_all_images_before_pruning(self):
        for environment, hostname in [('dev', 'app-dev.karlbruder.com'), ('prod', 'app.karlbruder.com app-prod.karlbruder.com')]:
            with self.subTest(environment=environment):
                run = self.run_host(environment, 'registry/service:test-sha')
                pull = next(call for call in run.call_args_list if call.args[-1] == 'pull')
                self.assertEqual(pull.kwargs['env']['APP_SERVER_NAMES'], hostname)
                self.assertEqual(sum(call.args[:2] == ('docker', 'inspect') for call in run.call_args_list), 4)
                self.assertEqual(run.call_args.args, ('docker', 'image', 'prune', '-f'))

    def test_host_rejects_wrong_image(self):
        with self.assertRaisesRegex(SystemExit, 'unexpected backend image'):
            self.run_host('dev', 'registry/backend:wrong')


class VerificationTests(unittest.TestCase):
    def test_metadata_checks_new_backend_and_accepts_reused_backend(self):
        env = dict(CONFIG, APPLICATION_BASE_URL='https://app.invalid', LANDING_BASE_URL='https://landing.invalid', RELEASED_AT='build-time')
        for services, sha, released, passed in [
            ('["backend"]', 'test-sha', 'build-time', True),
            ('["backend"]', 'wrong', 'build-time', False),
            ('["backend"]', 'test-sha', 'wrong', False),
            ('["landing"]', 'old', 'old', True),
            ('["landing"]', 'old', '', False),
        ]:
            with self.subTest(services=services, sha=sha, released=released), patch.dict(os.environ, dict(env, SERVICES=services)), patch.object(verify, 'request_with_retries', return_value=json.dumps({'git_sha': sha, 'released_at': released})):
                if passed:
                    verify.main([])
                else:
                    with self.assertRaises(SystemExit):
                        verify.main([])

    def test_http_failure_retries_then_returns_success(self):
        response = Mock()
        response.__enter__ = Mock(return_value=Mock(read=Mock(return_value=b'ok')))
        response.__exit__ = Mock(return_value=False)
        with patch.object(verify, 'urlopen', side_effect=[URLError('offline'), response]) as request, patch.object(verify.time, 'sleep') as sleep:
            self.assertEqual(verify.request_with_retries('https://app.invalid'), b'ok')
            self.assertEqual(request.call_count, 2)
            sleep.assert_called_once_with(5)

    def test_http_failure_stops_after_seven_attempts(self):
        with patch.object(verify, 'urlopen', side_effect=URLError('offline')) as request, patch.object(verify.time, 'sleep'), self.assertRaisesRegex(SystemExit, 'Request failed'):
            try:
                verify.request_with_retries('https://app.invalid')
            finally:
                self.assertEqual(request.call_count, 7)

    def test_stamping_reuses_manifest_for_unbuilt_service(self):
        results = [subprocess.CompletedProcess([], 1, '', ''), subprocess.CompletedProcess([], 0, '{"images":[{"imageManifest":"manifest"}]}', ''), subprocess.CompletedProcess([], 0, '', '')]
        with patch.dict(os.environ, dict(CONFIG, SERVICES='["backend","frontend","landing"]')), patch.object(common.subprocess, 'run', side_effect=results) as run:
            stamp.main([])
            self.assertIn('kb-dev/nginx', run.call_args.args[0])
            self.assertIn('manifest', run.call_args.args[0])


if __name__ == '__main__':
    unittest.main()
