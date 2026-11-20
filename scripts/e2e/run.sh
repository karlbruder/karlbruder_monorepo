#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
project=${E2E_PROJECT:-kb-e2e-$$}
if [[ ! $project =~ ^kb-e2e-[a-z0-9][a-z0-9_-]*$ ]]; then
  echo 'E2E_PROJECT must start with kb-e2e- and contain lowercase letters, digits, hyphens or underscores' >&2
  exit 2
fi
for resource in container network volume; do
  case "$resource" in
    container) existing=$(docker ps -aq --filter "label=com.docker.compose.project=$project") ;;
    network) existing=$(docker network ls -q --filter "label=com.docker.compose.project=$project") ;;
    volume) existing=$(docker volume ls -q --filter "label=com.docker.compose.project=$project") ;;
  esac
  if [[ -n $existing ]]; then echo "E2E project $project already has $resource resources" >&2; exit 1; fi
done
runtime=$(mktemp -d "${TMPDIR:-/tmp}/kb-e2e.XXXXXXXX")
chmod 700 "$runtime"
compose=(docker compose --env-file "$runtime/env" -f compose.e2e.yml -p "$project")
cleanup() {
  status=$?
  trap - EXIT
  if (( status != 0 )) && [[ -f "$runtime/env" ]]; then
    mkdir -p tests/e2e/artifacts
    "${compose[@]}" logs --no-color > tests/e2e/artifacts/services.log 2>&1 || true
  fi
  if [[ -f "$runtime/env" ]]; then
    if ! "${compose[@]}" down -v --remove-orphans; then
      echo "Failed to clean up E2E project $project" >&2
      if (( status == 0 )); then status=1; fi
    fi
  fi
  rm -rf "$runtime"
  exit "$status"
}
trap cleanup EXIT
node scripts/e2e/keys.js "$runtime"
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$runtime/gateway.key" -out "$runtime/gateway.crt" -days 1 -subj '/CN=auth-gateway' -addext 'subjectAltName=DNS:auth-gateway' >/dev/null 2>&1
"${compose[@]}" up -d --build
for attempt in {1..90}; do
  if curl -fsS --max-time 2 http://localhost:5174/api/health/db >/dev/null 2>&1 && curl -fsS --max-time 2 http://localhost:54331/auth/v1/health >/dev/null 2>&1; then break; fi
  if (( attempt == 90 )); then echo 'E2E services did not become ready' >&2; exit 1; fi
  sleep 2
done
"${compose[@]}" exec -T backend alembic upgrade head
"${compose[@]}" exec -T backend alembic current
"${compose[@]}" exec -T -e PYTHONPATH=/app backend python /e2e/seed.py > "$runtime/fixtures.json"
"${compose[@]}" exec -T ministack aws --endpoint-url http://localhost:4566 --region us-east-2 s3api put-bucket-cors --bucket kb-local-bucket --cors-configuration '{"CORSRules":[{"AllowedOrigins":["http://localhost:5174"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["Content-Type"],"MaxAgeSeconds":3000}]}'
if [[ ${E2E_MODE:-test} == explore ]]; then
  echo "E2E stack ready at http://localhost:5174. Fixture metadata: $runtime/fixtures.json"
  echo 'Press Enter to tear it down.'
  read -r _ || true
else
  E2E_FIXTURE_FILE="$runtime/fixtures.json" npm --prefix tests/e2e test
fi
