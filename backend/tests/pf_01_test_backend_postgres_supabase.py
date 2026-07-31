"""Acceptance coverage for issue PF-01.

Static and unit checks always run. The two live acceptance checks are opt-in:

- PF01_RUN_LOCAL_INTEGRATION=1 checks the backend already running in Compose.
- PF01_RUN_SUPABASE_INTEGRATION=1 checks the real Supabase Postgres database.

The Supabase URI is read from PF01_SUPABASE_DATABASE_URL or from the ignored
backend/.env.supabase file. Its value is never printed by these tests.
"""

import ast
import importlib
import os
from pathlib import Path

import httpx
import pytest
import yaml
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

PROJECT_REF = "felvzhgosqlqrileuwjm"
LOCAL_DATABASE_URL = "postgresql://user:password@db:5432/kb-db"
COMPOSE_DATABASE_URL = f"${{DATABASE_URL:-{LOCAL_DATABASE_URL}}}"
DEFAULT_REPO_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(os.getenv("PF01_REPO_ROOT", str(DEFAULT_REPO_ROOT))).resolve()
BACKEND_DIR = REPO_ROOT / "backend"
COMPOSE_FILE = REPO_ROOT / "compose.yml"
PROJECT_README = REPO_ROOT / "README.md"
BACKEND_README = BACKEND_DIR / "README.md"

# Importing the application creates its engine. A non-connecting local URL keeps
# unit and static checks independent from any running database.
os.environ.setdefault("DATABASE_URL", LOCAL_DATABASE_URL)
database = importlib.import_module("database")
main = importlib.import_module("main")


def _compose_config() -> dict:
    return yaml.safe_load(COMPOSE_FILE.read_text(encoding="utf-8"))


def _docs() -> str:
    content = "\n".join(
        (
            PROJECT_README.read_text(encoding="utf-8"),
            BACKEND_README.read_text(encoding="utf-8"),
        )
    )
    return " ".join(content.lower().split())


def _require_live_check(flag: str) -> None:
    if os.getenv(flag) != "1":
        pytest.skip(f"Set {flag}=1 to run this live acceptance check")


class _RedactedDatabaseUrl(str):
    """Keep the real URL usable while preventing pytest from repr-leaking it."""

    def __repr__(self) -> str:
        return "<redacted Supabase database URL>"


def _supabase_database_url() -> _RedactedDatabaseUrl | None:
    database_url = os.getenv("PF01_SUPABASE_DATABASE_URL")
    env_file = BACKEND_DIR / ".env.supabase"

    if not database_url and env_file.exists():
        database_url = dotenv_values(env_file).get("DATABASE_URL")

    current_database_url = os.getenv("DATABASE_URL")
    if not database_url and current_database_url and PROJECT_REF in current_database_url:
        database_url = current_database_url

    if database_url:
        return _RedactedDatabaseUrl(database_url)
    return None


def test_db_service_has_expected_local_credentials():
    """Check Compose db user, password, and database name."""
    db_environment = _compose_config()["services"]["db"]["environment"]

    assert db_environment == {
        "POSTGRES_USER": "user",
        "POSTGRES_PASSWORD": "password",
        "POSTGRES_DB": "kb-db",
    }


def test_backend_database_url_matches_compose_db_and_uses_db_host():
    """Check the backend URL matches the db service and uses host db."""
    compose = _compose_config()
    db_environment = compose["services"]["db"]["environment"]
    configured_url = compose["services"]["backend"]["environment"]["DATABASE_URL"]
    assert configured_url == COMPOSE_DATABASE_URL
    database_url = make_url(LOCAL_DATABASE_URL)

    assert database_url.username == db_environment["POSTGRES_USER"]
    assert database_url.password == db_environment["POSTGRES_PASSWORD"]
    assert database_url.database == db_environment["POSTGRES_DB"]
    assert database_url.host == "db"
    assert database_url.port == 5432


def test_backend_reads_database_url_from_environment_in_one_place():
    """Check DATABASE_URL is read only by backend/database.py, with no fallback."""
    getenv_calls = []

    for python_file in BACKEND_DIR.glob("*.py"):
        tree = ast.parse(python_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not node.args:
                continue
            if not isinstance(node.func, ast.Attribute) or node.func.attr != "getenv":
                continue
            first_argument = node.args[0]
            if isinstance(first_argument, ast.Constant) and first_argument.value == "DATABASE_URL":
                getenv_calls.append((python_file.name, len(node.args), len(node.keywords)))

    assert getenv_calls == [("database.py", 1, 0)]


def test_database_url_is_required(monkeypatch):
    """Check missing deploy configuration fails clearly instead of using another DB."""
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        database.get_database_url()


def test_local_compose_sets_the_backend_database_url():
    """Check Compose defaults to local but accepts DATABASE_URL from .env."""
    backend_environment = _compose_config()["services"]["backend"]["environment"]

    assert backend_environment["DATABASE_URL"] == COMPOSE_DATABASE_URL


@pytest.mark.parametrize(
    ("database_url", "expected_target"),
    (
        (LOCAL_DATABASE_URL, "local"),
        (
            "postgresql://postgres.project:password@"
            "aws-0-region.pooler.supabase.com:5432/postgres",
            "supabase",
        ),
        ("postgresql://user:password@postgres.example.com:5432/app", "external"),
    ),
)
def test_database_target_is_classified_safely(database_url, expected_target):
    """Check health can identify the destination without returning its URL."""
    assert database.classify_database_target(database_url) == expected_target


def test_deploy_docs_set_database_url_to_supabase():
    """Check deploy instructions set DATABASE_URL to Supabase Postgres."""
    docs = _docs()

    assert "ec2: database_url -> postgres do supabase" in docs


def test_deploy_docs_get_database_url_from_a_secret_or_host_environment():
    """Check deploy DATABASE_URL comes from a secret or host environment."""
    docs = _docs()

    assert "aws secrets manager" in docs
    assert "ssm parameter store" in docs
    assert "injetada no ambiente do container como `database_url`" in docs


def test_docs_leave_supabase_auth_in_auth_schema():
    """Check Supabase Auth remains in its default auth schema."""
    docs = _docs()

    assert "`auth`: gerenciado pelo supabase auth" in docs


def test_docs_put_karlbruder_domain_objects_in_public_schema():
    """Check Karlbruder domain tables and migrations use public."""
    docs = _docs()

    assert "`public`: tabelas, índices e migrations do domínio karlbruder" in docs


def test_docs_explain_the_auth_and_public_schema_split():
    """Check the next developer is warned not to modify the auth schema."""
    docs = _docs()

    assert "não devem alterar objetos pertencentes a `auth`" in docs


def test_docs_explain_local_uses_compose_postgres():
    """Check the short note says local uses Compose Postgres."""
    docs = _docs()

    assert "local: database_url -> postgres do compose" in docs


def test_docs_explain_deploy_does_not_run_compose_db():
    """Check the short note says deploy does not run the Compose db service."""
    docs = _docs()

    assert "executados sem o serviço `db`" in docs


def test_docs_explain_local_and_supabase_data_are_not_synchronized():
    """Check the short note distinguishes the two physical databases."""
    docs = _docs()

    assert "não são sincronizados automaticamente" in docs


class _SuccessfulResult:
    def scalar_one(self):
        return 1


class _SchemaResult:
    def __init__(self, schemas):
        self.schemas = schemas

    def scalars(self):
        return self.schemas


class _RecordingConnection:
    def __init__(self, statements, schemas):
        self.statements = statements
        self.schemas = schemas

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, statement):
        self.statements.append(str(statement))
        if "information_schema.schemata" in str(statement):
            return _SchemaResult(self.schemas)
        return _SuccessfulResult()


class _RecordingEngine:
    def __init__(self, statements, database_url=LOCAL_DATABASE_URL, schemas=None):
        self.statements = statements
        self.url = make_url(database_url)
        self.schemas = schemas or {"public"}

    def connect(self):
        return _RecordingConnection(self.statements, self.schemas)


def test_health_endpoint_runs_select_one(monkeypatch):
    """Check the connectivity endpoint executes SELECT 1 and returns success."""
    statements = []
    monkeypatch.setattr(main, "engine", _RecordingEngine(statements))

    response = TestClient(main.karlbruder_app).get("/health/db")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "connected",
        "database_target": "local",
        "result": 1,
        "schemas": {
            "public": True,
            "auth": False,
        },
    }
    assert statements[0] == "SELECT 1"
    assert "information_schema.schemata" in statements[1]


def test_health_endpoint_reports_supabase_auth_schema(monkeypatch):
    """Check health distinguishes Supabase and reports both expected schemas."""
    supabase_url = (
        "postgresql://postgres.project:password@"
        "aws-0-region.pooler.supabase.com:5432/postgres"
    )
    monkeypatch.setattr(
        main,
        "engine",
        _RecordingEngine([], supabase_url, {"public", "auth"}),
    )

    response = TestClient(main.karlbruder_app).get("/health/db")

    assert response.status_code == 200
    assert response.json()["database_target"] == "supabase"
    assert response.json()["schemas"] == {"public": True, "auth": True}


@pytest.mark.integration
def test_acceptance_local_compose_backend_connects():
    """Acceptance: with Compose up, the backend connects to local Postgres."""
    _require_live_check("PF01_RUN_LOCAL_INTEGRATION")
    backend_url = os.getenv("PF01_LOCAL_BACKEND_URL", "http://localhost:8000")

    try:
        response = httpx.get(f"{backend_url}/health/db", timeout=10)
    except httpx.HTTPError as error:
        pytest.fail(f"Local Compose backend is unreachable: {error}")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "connected",
        "database_target": "local",
        "result": 1,
        "schemas": {
            "public": True,
            "auth": False,
        },
    }


@pytest.fixture(scope="module")
def supabase_database_url():
    """Return the opt-in Supabase URI without printing its secret."""
    _require_live_check("PF01_RUN_SUPABASE_INTEGRATION")
    database_url = _supabase_database_url()
    if not database_url:
        pytest.fail(
            "Provide PF01_SUPABASE_DATABASE_URL or backend/.env.supabase "
            "with the Supabase Postgres URI"
        )

    return database_url


@pytest.fixture(scope="module")
def supabase_connection(supabase_database_url):
    """Connect through the same SQLAlchemy engine factory used by the backend."""
    parsed_url = make_url(supabase_database_url)
    if "connect_timeout" not in parsed_url.query:
        parsed_url = parsed_url.update_query_dict({"connect_timeout": "10"})

    # Pass the URL object directly. str(URL) masks its password as "***" in
    # SQLAlchemy 2 and would attempt to authenticate with that masked value.
    supabase_engine = database.create_database_engine(parsed_url)
    try:
        with supabase_engine.connect() as connection:
            yield connection
    finally:
        supabase_engine.dispose()


@pytest.mark.integration
@pytest.mark.supabase
def test_deploy_database_url_targets_the_same_supabase_project(
    supabase_database_url,
):
    """Check deploy uses a Postgres URI from this project's Supabase instance."""
    parsed_url = make_url(supabase_database_url)

    assert parsed_url.drivername.startswith("postgresql")
    assert parsed_url.database == "postgres"
    assert PROJECT_REF in (parsed_url.username or "") or PROJECT_REF in (
        parsed_url.host or ""
    )


@pytest.mark.integration
@pytest.mark.supabase
def test_acceptance_same_backend_connects_to_supabase(supabase_connection):
    """Acceptance: the same backend engine executes SELECT 1 on Supabase."""
    assert supabase_connection.execute(text("SELECT 1")).scalar_one() == 1


@pytest.mark.integration
@pytest.mark.supabase
def test_acceptance_supabase_is_ready_for_public_domain_schema(
    supabase_connection,
):
    """Acceptance: the backend connection resolves domain objects to public."""
    schema = supabase_connection.execute(text("SELECT current_schema()"))

    assert schema.scalar_one() == "public"


@pytest.mark.integration
@pytest.mark.supabase
def test_acceptance_supabase_contains_auth_schema(supabase_connection):
    """Acceptance: Supabase keeps its managed Auth objects in auth."""
    schema = supabase_connection.execute(
        text(
            """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name = 'auth'
            """
        )
    )

    assert schema.scalar_one() == "auth"
