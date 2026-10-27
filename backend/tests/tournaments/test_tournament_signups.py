"""REG-AC-001–010, 014–016: signup ownership, uniqueness, dates, and privacy."""

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

import auth  # noqa: E402
import tournaments.signups as signup_service  # noqa: E402
from database import Base, get_session  # noqa: E402
from main import karlbruder_app  # noqa: E402
from tournaments.models import Tournament, TournamentSignup  # noqa: E402


class StaticJwksClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, _token):
        return SimpleNamespace(key=self.key)


def _headers(key, *, user_id=None, email="fixture@example.test", role="regular_user"):
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "iss": f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1",
            "aud": "authenticated",
            "exp": now + timedelta(minutes=5),
            "iat": now,
            "sub": str(user_id or uuid4()),
            "role": "authenticated",
            "email": email,
            "app_metadata": {"karlbruder_role": role},
        },
        key,
        algorithm="ES256",
        headers={"kid": "fixture-key"},
    )
    return {"Authorization": f"Bearer {token}"}


def _event(*, internal=False, **overrides):
    return {
        "name": "Fixture Tournament",
        "starts_at": "2027-01-17T12:00:00Z",
        "is_internal": internal,
        "registration_opens_on": "2026-10-01",
        "registration_closes_on": "2026-10-31",
        "terms_version": "fixture-terms-v1",
        "regulation_version": "fixture-regulation-v1",
        **overrides,
    }


def _signup(*, email="fixture@example.test", document="AB-123", **overrides):
    return {
        "full_name": "Fixture Competitor",
        "birth_date": "2000-01-01",
        "document_type": "passport",
        "document_id": document,
        "email": email,
        "phone": "+55 11 0000-0000",
        "city": "Fixture City",
        "country": "Fixture Country",
        "hema_practice_duration": "3 years",
        "prior_tournaments_count": 0,
        "emergency_contact_name": "Fixture Contact",
        "emergency_contact_phone": "+55 11 0000-0001",
        "declares_truthful_information": True,
        "declares_required_equipment": True,
        "declares_physically_fit": True,
        "accepts_regulation": True,
        "accepts_data_processing": True,
        "acknowledges_inherent_risks": True,
        "accepts_cancellation_policy": True,
        "image_use_authorized": False,
        **overrides,
    }


@pytest.fixture
def setup(monkeypatch):
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(auth, "get_jwks_client", lambda: StaticJwksClient(key.public_key()))
    monkeypatch.setattr(signup_service, "registration_date", lambda: date(2026, 10, 19))
    engine = create_engine(
        "sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    with engine.begin() as connection:
        connection.execute(text("ATTACH DATABASE ':memory:' AS public"))
    Base.metadata.create_all(engine)

    def test_session():
        with Session(engine) as session:
            yield session

    karlbruder_app.dependency_overrides[get_session] = test_session
    try:
        with TestClient(karlbruder_app) as client:
            yield client, key, engine
    finally:
        karlbruder_app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


def _create_event(client, key, **changes):
    response = client.post(
        "/api/tournaments", json=_event(**changes), headers=_headers(key, role="admin")
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_registration_day_uses_fixed_utc_minus_three_at_midnight():
    assert signup_service.registration_date(datetime(2026, 10, 1, 2, 59, tzinfo=UTC)) == date(2026, 9, 30)
    assert signup_service.registration_date(datetime(2026, 10, 1, 3, 0, tzinfo=UTC)) == date(2026, 10, 1)
    assert signup_service.registration_date(datetime(2026, 11, 1, 2, 59, tzinfo=UTC)) == date(2026, 10, 31)
    assert signup_service.registration_date(datetime(2026, 11, 1, 3, 0, tzinfo=UTC)) == date(2026, 11, 1)


def test_self_signup_owner_lookup_admin_listing_and_private_projection(setup):
    client, key, engine = setup
    event_id = _create_event(client, key, max_competitor_capacity=0)
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id)
    created = client.post(
        f"/api/tournaments/{event_id}/signups", json=_signup(), headers=owner
    )
    assert created.status_code == 201, created.text
    owner_view = created.json()
    number = owner_view["inscription_number"]
    assert number.startswith(f"T{event_id}-000001-")
    assert owner_view["status"] == "awaiting_payment"
    assert owner_view["accepted_terms_version"] == "fixture-terms-v1"
    assert owner_view["declares_truthful_information"] is True
    assert owner_view["image_use_authorized"] is False
    assert {"safety_note", "acceptance_ip", "user_id", "email_normalized"}.isdisjoint(owner_view)
    with Session(engine) as session:
        stored = session.scalar(select(TournamentSignup))
        assert stored.user_id == owner_id
        assert stored.acceptance_ip == "testclient"
        assert stored.accepted_at is not None
        assert stored.declares_truthful_information is True
        assert stored.safety_note is None
        stored.safety_note = "Staff-only fixture"
        session.commit()

    detail_path = f"/api/tournaments/{event_id}/signups/{number}"
    assert client.get(detail_path, headers=owner).json() == owner_view
    other = _headers(key, email="other@example.test")
    assert client.get(detail_path, headers=other).status_code == 404
    assert client.get(detail_path).status_code == 401
    assert client.get(detail_path, headers={"Authorization": "Bearer invalid"}).status_code == 401
    assert client.get(detail_path, headers={"Authorization": "Basic invalid"}).status_code == 401
    assert client.get(f"/api/tournaments/{event_id}/signups", headers=owner).status_code == 403
    assert client.get(f"/api/tournaments/{event_id}/signups").status_code == 401
    admin = _headers(key, role="admin")
    staff_view = client.get(detail_path, headers=admin).json()
    assert staff_view["safety_note"] == "Staff-only fixture"
    assert staff_view["acceptance_ip"] == "testclient"
    assert staff_view["declares_truthful_information"] is True
    assert staff_view["accepted_terms_version"] == "fixture-terms-v1"
    assert staff_view["accepted_at"] == owner_view["accepted_at"]
    assert staff_view["user_id"] == str(owner_id)
    assert client.get(f"/api/tournaments/{event_id}/signups", headers=admin).json() == [staff_view]
    assert "safety_note" not in client.get(detail_path, headers=owner).json()


def test_priv_002_truthfulness_requires_explicit_json_true_without_creating_row(setup):
    client, key, engine = setup
    event_id = _create_event(client, key)
    path = f"/api/tournaments/{event_id}/signups"
    owner = _headers(key)
    missing = _signup()
    missing.pop("declares_truthful_information")
    for payload in (
        missing,
        _signup(declares_truthful_information=False),
        _signup(declares_truthful_information=1),
        _signup(declares_truthful_information="true"),
        _signup(declares_truthful_information=None),
    ):
        response = client.post(path, json=payload, headers=owner)
        assert response.status_code == 422, response.text
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(TournamentSignup)) == 0


def test_authentication_owner_claims_and_required_input(setup):
    client, key, engine = setup
    event_id = _create_event(client, key)
    path = f"/api/tournaments/{event_id}/signups"
    assert client.post(path, json=_signup()).status_code == 401
    assert client.post(path, json=_signup(), headers={"Authorization": "Bearer bad"}).status_code == 401
    assert client.post(path, json=_signup(), headers={"Authorization": "Basic bad"}).status_code == 401
    owner = _headers(key)
    for changes in (
        {"user_id": str(uuid4())},
        {"status": "confirmed"},
        {"inscription_number": "chosen"},
        {"accepted_terms_version": "chosen"},
        {"safety_note": "client-supplied"},
        {"full_name": "   "},
        {"document_id": "...--"},
        {"hema_practice_duration": None},
        {"prior_tournaments_count": -1},
        {"declares_physically_fit": False},
        {"declares_physically_fit": 1},
        {"image_use_authorized": None},
        {"image_use_authorized": "false"},
    ):
        response = client.post(path, json=_signup(**changes), headers=owner)
        assert response.status_code in (400, 422), (changes, response.text)
    assert client.post(
        path, json=_signup(email="someone-else@example.test"), headers=owner
    ).status_code == 400
    assert client.post(
        path,
        json=_signup(
            email="F.I.X.T.U.R.E@example.test",
            hema_practice_duration=None,
            hema_practice_start_year=2020,
            school_name="",
            responsible_instructor_name="",
            state="",
            special_category_note="",
        ),
        headers=owner,
    ).status_code == 201
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(TournamentSignup)) == 1


def test_window_staff_closure_and_configured_versions(setup, monkeypatch):
    client, key, engine = setup
    event_id = _create_event(client, key)
    path = f"/api/tournaments/{event_id}/signups"
    owner = _headers(key)
    for today, expected in ((date(2026, 9, 30), 400), (date(2026, 10, 1), 201)):
        monkeypatch.setattr(signup_service, "registration_date", lambda day=today: day)
        assert client.post(path, json=_signup(), headers=owner).status_code == expected
    with Session(engine) as session:
        session.query(TournamentSignup).delete()
        session.commit()
    for today, expected in ((date(2026, 10, 31), 201), (date(2026, 11, 1), 400)):
        monkeypatch.setattr(signup_service, "registration_date", lambda day=today: day)
        assert client.post(path, json=_signup(document=f"DOC-{today}"), headers=owner).status_code == expected
        if expected == 201:
            with Session(engine) as session:
                session.query(TournamentSignup).delete()
                session.commit()
    monkeypatch.setattr(signup_service, "registration_date", lambda: date(2026, 10, 19))
    for changes in (
        {"new_registrations_closed": True},
        {"registration_opens_on": None},
        {"registration_closes_on": None},
        {"terms_version": None},
        {"regulation_version": None},
    ):
        event = _create_event(client, key, **changes)
        assert client.post(
            f"/api/tournaments/{event}/signups", json=_signup(), headers=owner
        ).status_code == 400
    assert client.post(
        "/api/tournaments/99999/signups", json=_signup(), headers=owner
    ).status_code == 404


def test_internal_participation_and_tournament_scope(setup):
    client, key, _ = setup
    public_id = _create_event(client, key)
    internal_id = _create_event(client, key, internal=True)
    regular = _headers(key)
    member = _headers(key, role="guild_member")
    assert client.post(
        f"/api/tournaments/{internal_id}/signups", json=_signup(), headers=regular
    ).status_code == 404
    created = client.post(
        f"/api/tournaments/{internal_id}/signups", json=_signup(), headers=member
    )
    assert created.status_code == 201
    number = created.json()["inscription_number"]
    assert client.get(
        f"/api/tournaments/{internal_id}/signups/{number}", headers=regular
    ).status_code == 404
    assert client.get(
        f"/api/tournaments/{public_id}/signups/{number}", headers=member
    ).status_code == 404
    assert client.post(
        f"/api/tournaments/{public_id}/signups", json=_signup(), headers=member
    ).status_code == 201


def test_normalized_duplicates_repeated_create_and_cancelled_replacement(setup):
    client, key, engine = setup
    event_id = _create_event(client, key)
    path = f"/api/tournaments/{event_id}/signups"
    first_user_id = uuid4()
    first = _headers(key, user_id=first_user_id, email="First.User@example.test")
    first_payload = _signup(email="FIRSTUSER@example.test", document="AB-123")
    assert client.post(path, json=first_payload, headers=first).status_code == 201
    assert client.post(path, json=first_payload, headers=first).status_code == 409
    assert client.post(
        path, json=_signup(email="other@example.test", document="OTHER"),
        headers=_headers(key, user_id=first_user_id, email="other@example.test"),
    ).status_code == 409
    assert client.post(
        path, json=_signup(email="first.user@example.test", document="OTHER"),
        headers=_headers(key, email="first.user@example.test"),
    ).status_code == 409
    assert client.post(
        path, json=_signup(email="second@example.test", document="a.b 1-2-3"),
        headers=_headers(key, email="second@example.test"),
    ).status_code == 409
    with Session(engine) as session:
        signup = session.scalar(select(TournamentSignup))
        old_number = signup.inscription_number
        signup.status = "cancelled"
        session.commit()
    replacement = client.post(path, json=first_payload, headers=first)
    assert replacement.status_code == 201
    assert replacement.json()["inscription_number"] != old_number
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(TournamentSignup)) == 2


@pytest.mark.integration
def test_postgres_concurrent_duplicate_and_number_allocation(monkeypatch, disposable_postgres_engine):
    engine = disposable_postgres_engine
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(auth, "get_jwks_client", lambda: StaticJwksClient(key.public_key()))
    monkeypatch.setattr(signup_service, "registration_date", lambda: date(2026, 10, 19))

    def test_session():
        with Session(engine) as session:
            yield session

    try:
        Base.metadata.create_all(engine)
        karlbruder_app.dependency_overrides[get_session] = test_session
        with TestClient(karlbruder_app) as client:
            event_id = _create_event(client, key)
            path = f"/api/tournaments/{event_id}/signups"
            owner = _headers(key)
            with ThreadPoolExecutor(max_workers=2) as executor:
                responses = list(executor.map(
                    lambda _: client.post(path, json=_signup(), headers=owner), range(2)
                ))
            assert sorted(response.status_code for response in responses) == [201, 409]
            with ThreadPoolExecutor(max_workers=2) as executor:
                responses = list(executor.map(
                    lambda index: client.post(
                        path,
                        json=_signup(email=f"other{index}@example.test", document=f"DOC-{index}"),
                        headers=_headers(key, email=f"other{index}@example.test"),
                    ), range(2)
                ))
            assert [response.status_code for response in responses] == [201, 201]
            numbers = {response.json()["inscription_number"] for response in responses}
            assert len(numbers) == 2
            with Session(engine) as session:
                assert session.scalar(select(func.count()).select_from(TournamentSignup)) == 3
                assert session.get(Tournament, event_id).next_inscription_serial == 4
    finally:
        karlbruder_app.dependency_overrides.clear()
