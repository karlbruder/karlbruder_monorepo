"""REG-AC-001–010, 014–016: signup ownership, uniqueness, dates, and privacy."""

import os
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

import app.auth as auth  # noqa: E402
import app.tournaments.services.tournament_local_dates as tournament_local_dates  # noqa: E402
from app.core.services.storage import FileStorageError, get_file_storage  # noqa: E402
from app.main import karlbruder_app  # noqa: E402
from app.tournaments.models import Tournament, TournamentSignup, TournamentSignupFile  # noqa: E402


class StaticJwksClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, _token):
        return SimpleNamespace(key=self.key)


class RecordingFileStorage:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.copy_should_fail = False
        self.deleted_keys: list[str] = []

    def create_presigned_put_url(
        self, storage_key: str, *, content_type: str, expires_in: int
    ) -> str:
        return f"https://mock.example/upload/{storage_key}"

    def create_presigned_get_url(self, storage_key: str, *, expires_in: int) -> str:
        return f"https://mock.example/download/{storage_key}"

    def head_object(self, storage_key: str) -> tuple[int, str | None]:
        if storage_key not in self.objects:
            raise FileStorageError("Object not found")
        body, content_type = self.objects[storage_key]
        return len(body), content_type

    def read_object_bytes(self, storage_key: str, *, start: int, end: int) -> bytes:
        body, _content_type = self.objects[storage_key]
        return body[start : end + 1]

    def copy_object(self, source_storage_key: str, destination_storage_key: str) -> None:
        if self.copy_should_fail:
            raise FileStorageError("Failed to copy object")
        self.objects[destination_storage_key] = self.objects[source_storage_key]

    def delete_file(self, storage_key: str) -> None:
        self.deleted_keys.append(storage_key)
        self.objects.pop(storage_key, None)

    def store_file(self, storage_key: str, body, content_type: str) -> None:
        payload = body if isinstance(body, bytes) else body.read()
        self.objects[storage_key] = (payload, content_type)

    def read_file(self, storage_key: str) -> tuple[bytes, str]:
        return self.objects[storage_key]


def _post_signup(
    client,
    tournament_id,
    headers,
    signup=None,
    *,
    staged_parental_term_key=None,
    staged_parental_term_name=None,
):
    payload = dict(signup or _signup())
    if staged_parental_term_key is not None:
        payload["parental_term_storage_key"] = staged_parental_term_key
        payload["parental_term_original_file_name"] = staged_parental_term_name or "term.pdf"
    request_kwargs = {"json": payload}
    if headers is not None:
        request_kwargs["headers"] = headers
    return client.post(f"/api/tournaments/{tournament_id}/signups", **request_kwargs)


def _pdf_bytes(extra: bytes = b"") -> bytes:
    return b"%PDF-1.4\n" + extra


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


_slug_serial = 0


def _event(*, internal=False, **overrides):
    global _slug_serial
    _slug_serial += 1
    return {
        "name": "Fixture Tournament",
        "slug": f"fixture-{_slug_serial}",
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
def setup(monkeypatch, db_session):
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(auth, "get_jwks_client", lambda: StaticJwksClient(key.public_key()))
    monkeypatch.setattr(
        tournament_local_dates,
        "current_local_calendar_date",
        lambda now=None: date(2026, 10, 19),
    )
    storage = RecordingFileStorage()
    karlbruder_app.dependency_overrides[get_file_storage] = lambda: storage
    with TestClient(karlbruder_app) as client:
        yield client, key, db_session, storage
    karlbruder_app.dependency_overrides.pop(get_file_storage, None)


def _create_event(client, key, **changes):
    response = client.post(
        "/api/tournaments", json=_event(**changes), headers=_headers(key, role="admin")
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_self_signup_owner_lookup_admin_listing_and_private_projection(setup):
    """The owner can read their own signup, and staff-only fields stay off that view.

    Another athlete cannot read it. An admin can, including the safety note and the full list.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key, max_competitor_capacity=0)
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id)
    created = _post_signup(client, event_id, owner)
    assert created.status_code == 201, created.text
    owner_view = created.json()
    number = owner_view["inscription_number"]
    assert number.startswith(f"T{event_id}-000001-")
    assert owner_view["status"] == "awaiting_payment"
    assert owner_view["accepted_terms_version"] == "fixture-terms-v1"
    assert owner_view["declares_truthful_information"] is True
    assert owner_view["image_use_authorized"] is False
    assert {"safety_note", "acceptance_ip", "user_id", "email_normalized"}.isdisjoint(owner_view)
    stored = db_session.scalar(select(TournamentSignup))
    assert stored.user_id == owner_id
    assert stored.acceptance_ip == "testclient"
    assert stored.accepted_at is not None
    assert stored.declares_truthful_information is True
    assert stored.safety_note is None
    stored.safety_note = "Staff-only fixture"
    db_session.commit()

    detail_path = f"/api/tournaments/{event_id}/signups/{number}"
    assert client.get(detail_path, headers=owner).json() == owner_view
    other = _headers(key, email="other@example.test")
    assert client.get(detail_path, headers=other).status_code == 404
    assert client.get(detail_path).status_code == 401
    assert client.get(detail_path, headers={"Authorization": "Bearer invalid"}).status_code == 401
    assert client.get(detail_path, headers={"Authorization": "Basic invalid"}).status_code == 401
    owner_list = client.get(f"/api/tournaments/{event_id}/signups", headers=owner)
    assert owner_list.status_code == 200
    assert owner_list.json() == [owner_view]
    assert {"safety_note", "acceptance_ip", "user_id"}.isdisjoint(owner_list.json()[0])
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


def test_list_signups_returns_own_rows_for_participants_and_all_rows_for_admin(setup):
    """Each participant lists only their registrations. Admins list everyone. Guests get 401."""
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    internal_id = _create_event(client, key, internal=True)
    owner_a_id = uuid4()
    owner_b_id = uuid4()
    owner_a = _headers(key, user_id=owner_a_id, email="a@example.test")
    owner_b = _headers(key, user_id=owner_b_id, email="b@example.test")
    signup_b = _signup(email="b@example.test", document="CD-456")
    created_a = _post_signup(
        client,
        event_id,
        owner_a,
        _signup(email="a@example.test"),
    )
    created_b = _post_signup(client, event_id, owner_b, signup_b)
    assert created_a.status_code == created_b.status_code == 201
    view_a = created_a.json()
    view_b = created_b.json()
    list_path = f"/api/tournaments/{event_id}/signups"
    assert client.get(list_path, headers=owner_a).json() == [view_a]
    assert client.get(list_path, headers=owner_b).json() == [view_b]
    other_event = _create_event(client, key)
    assert client.get(f"/api/tournaments/{other_event}/signups", headers=owner_a).json() == []
    stored = db_session.scalar(
        select(TournamentSignup).where(TournamentSignup.inscription_number == view_a["inscription_number"])
    )
    stored.status = "cancelled"
    db_session.commit()
    cancelled_list = client.get(list_path, headers=owner_a).json()
    assert len(cancelled_list) == 1
    assert cancelled_list[0]["status"] == "cancelled"
    assert {"safety_note", "acceptance_ip", "user_id"}.isdisjoint(cancelled_list[0])
    admin = _headers(key, role="admin")
    admin_rows = client.get(list_path, headers=admin).json()
    assert len(admin_rows) == 2
    assert {row["inscription_number"] for row in admin_rows} == {
        view_a["inscription_number"],
        view_b["inscription_number"],
    }
    assert all(row.get("user_id") for row in admin_rows)
    regular = _headers(key)
    assert client.get(f"/api/tournaments/{internal_id}/signups", headers=regular).status_code == 404


def test_priv_002_truthfulness_requires_explicit_json_true_without_creating_row(setup):
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
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
        response = _post_signup(client, event_id, owner, payload)
        assert response.status_code == 422, response.text
    assert db_session.scalar(select(func.count()).select_from(TournamentSignup)) == 0


def test_authentication_owner_claims_and_required_input(setup):
    """A signup needs a real bearer token and the account email.

    The client cannot set the owner, status, inscription number, or staff fields. One valid signup is stored.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    assert _post_signup(client, event_id, None).status_code == 401
    assert _post_signup(client, event_id, {"Authorization": "Bearer bad"}).status_code == 401
    assert _post_signup(client, event_id, {"Authorization": "Basic bad"}).status_code == 401
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
        response = _post_signup(client, event_id, owner, _signup(**changes))
        assert response.status_code in (400, 422), (changes, response.text)
    assert _post_signup(
        client, event_id, owner, _signup(email="someone-else@example.test")
    ).status_code == 400
    assert _post_signup(
        client,
        event_id,
        owner,
        _signup(
            email="F.I.X.T.U.R.E@example.test",
            hema_practice_duration=None,
            hema_practice_start_year=2020,
            school_name="",
            responsible_instructor_name="",
            state="",
            special_category_note="",
        ),
    ).status_code == 201
    assert db_session.scalar(select(func.count()).select_from(TournamentSignup)) == 1


def test_window_staff_closure_and_configured_versions(setup, monkeypatch):
    """Signup is accepted only on the inclusive registration dates.

    Staff closure, missing dates, or missing terms and regulation versions reject it. An unknown tournament is not found.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    for today, expected in ((date(2026, 9, 30), 400), (date(2026, 10, 1), 201)):
        monkeypatch.setattr(
            tournament_local_dates,
            "current_local_calendar_date",
            lambda now=None, day=today: day,
        )
        assert _post_signup(client, event_id, owner).status_code == expected
    db_session.execute(delete(TournamentSignup))
    db_session.commit()
    for today, expected in ((date(2026, 10, 31), 201), (date(2026, 11, 1), 400)):
        monkeypatch.setattr(
            tournament_local_dates,
            "current_local_calendar_date",
            lambda now=None, day=today: day,
        )
        assert _post_signup(
            client, event_id, owner, _signup(document=f"DOC-{today}")
        ).status_code == expected
        if expected == 201:
            db_session.execute(delete(TournamentSignup))
            db_session.commit()
    monkeypatch.setattr(
        tournament_local_dates,
        "current_local_calendar_date",
        lambda now=None: date(2026, 10, 19),
    )
    for changes in (
        {"new_registrations_closed": True},
        {"registration_opens_on": None},
        {"registration_closes_on": None},
        {"terms_version": None},
        {"regulation_version": None},
    ):
        event = _create_event(client, key, **changes)
        assert _post_signup(client, event, owner).status_code == 400
    assert _post_signup(client, 99999, owner).status_code == 404


def test_internal_participation_and_tournament_scope(setup):
    """A regular user cannot see or join an internal event. A guild member can.

    An inscription number from one tournament is not found on another.
    """
    client, key, _, _storage = setup
    public_id = _create_event(client, key)
    internal_id = _create_event(client, key, internal=True)
    regular = _headers(key)
    member = _headers(key, role="guild_member")
    assert _post_signup(client, internal_id, regular).status_code == 404
    created = _post_signup(client, internal_id, member)
    assert created.status_code == 201
    number = created.json()["inscription_number"]
    assert client.get(
        f"/api/tournaments/{internal_id}/signups/{number}", headers=regular
    ).status_code == 404
    assert client.get(
        f"/api/tournaments/{public_id}/signups/{number}", headers=member
    ).status_code == 404
    assert _post_signup(client, public_id, member).status_code == 201


def test_normalized_duplicates_repeated_create_and_cancelled_replacement(setup):
    """One active signup per person, email, and document, once case and punctuation are ignored.

    Repeating that create conflicts. A cancelled signup can be replaced, and the new number is different.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    first_user_id = uuid4()
    first = _headers(key, user_id=first_user_id, email="First.User@example.test")
    first_payload = _signup(email="FIRSTUSER@example.test", document="AB-123")
    assert _post_signup(client, event_id, first, first_payload).status_code == 201
    assert _post_signup(client, event_id, first, first_payload).status_code == 409
    assert _post_signup(
        client,
        event_id,
        _headers(key, user_id=first_user_id, email="other@example.test"),
        _signup(email="other@example.test", document="OTHER"),
    ).status_code == 409
    assert _post_signup(
        client,
        event_id,
        _headers(key, email="first.user@example.test"),
        _signup(email="first.user@example.test", document="OTHER"),
    ).status_code == 409
    assert _post_signup(
        client,
        event_id,
        _headers(key, email="second@example.test"),
        _signup(email="second@example.test", document="a.b 1-2-3"),
    ).status_code == 409
    signup = db_session.scalar(select(TournamentSignup))
    old_number = signup.inscription_number
    signup.status = "cancelled"
    db_session.commit()
    replacement = _post_signup(client, event_id, first, first_payload)
    assert replacement.status_code == 201
    assert replacement.json()["inscription_number"] != old_number
    assert db_session.scalar(select(func.count()).select_from(TournamentSignup)) == 2


def _minor_signup(**overrides):
    return _signup(birth_date="2010-06-01", **overrides)


def test_parental_term_on_create_and_read(setup):
    """Minors need a staged S3 object. Adults must not send a storage key. Reads return presigned URLs."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    pdf_bytes = _pdf_bytes()

    adult_created = _post_signup(client, event_id, owner)
    assert adult_created.status_code == 201
    assert db_session.scalar(select(func.count()).select_from(TournamentSignupFile)) == 0

    upload_url_response = client.post(
        f"/api/tournaments/{event_id}/signups/parental-term/upload-url",
        headers=owner,
    )
    staged_key = upload_url_response.json()["storage_key"]
    assert _post_signup(
        client,
        event_id,
        owner,
        _signup(),
        staged_parental_term_key=staged_key,
    ).status_code == 422

    minor_owner = _headers(key, user_id=uuid4(), email="minor@example.test")
    assert _post_signup(
        client,
        event_id,
        minor_owner,
        _minor_signup(email="minor@example.test", document="MINOR-1"),
    ).status_code == 422
    assert db_session.scalar(select(func.count()).select_from(TournamentSignup)) == 1

    minor_upload = client.post(
        f"/api/tournaments/{event_id}/signups/parental-term/upload-url",
        headers=minor_owner,
    )
    assert minor_upload.status_code == 200
    staged_key = minor_upload.json()["storage_key"]
    storage.objects[staged_key] = (pdf_bytes, "application/pdf")

    minor_created = _post_signup(
        client,
        event_id,
        minor_owner,
        _minor_signup(email="minor@example.test", document="MINOR-1"),
        staged_parental_term_key=staged_key,
        staged_parental_term_name="term.pdf",
    )
    assert minor_created.status_code == 201, minor_created.text
    number = minor_created.json()["inscription_number"]
    assert staged_key not in storage.objects
    assert db_session.scalar(select(func.count()).select_from(TournamentSignupFile)) == 1
    final_key = db_session.scalar(select(TournamentSignupFile)).storage_key
    assert "parental_term" in final_key
    assert "/signups/" in final_key

    bad_user_id = uuid4()
    bad_user = _headers(key, user_id=bad_user_id, email="bad-type@example.test")
    bad_upload = client.post(
        f"/api/tournaments/{event_id}/signups/parental-term/upload-url",
        headers=bad_user,
    )
    bad_key = bad_upload.json()["storage_key"]
    storage.objects[bad_key] = (b"<html>not pdf</html>", "application/pdf")
    assert _post_signup(
        client,
        event_id,
        bad_user,
        _minor_signup(email="bad-type@example.test", document="MINOR-2"),
        staged_parental_term_key=bad_key,
    ).status_code == 415

    from app.core.services.storage.services.upload_validation import MAX_UPLOAD_BYTES

    big_user = _headers(key, user_id=uuid4(), email="big@example.test")
    huge_upload = client.post(
        f"/api/tournaments/{event_id}/signups/parental-term/upload-url",
        headers=big_user,
    )
    huge_key = huge_upload.json()["storage_key"]
    storage.objects[huge_key] = (_pdf_bytes(b"x" * (MAX_UPLOAD_BYTES + 1)), "application/pdf")
    assert _post_signup(
        client,
        event_id,
        big_user,
        _minor_signup(email="big@example.test", document="MINOR-3"),
        staged_parental_term_key=huge_key,
    ).status_code == 413

    fail_user = _headers(key, user_id=uuid4(), email="fail@example.test")
    fail_upload = client.post(
        f"/api/tournaments/{event_id}/signups/parental-term/upload-url",
        headers=fail_user,
    )
    fail_key = fail_upload.json()["storage_key"]
    storage.objects[fail_key] = (pdf_bytes, "application/pdf")
    storage.copy_should_fail = True
    assert _post_signup(
        client,
        event_id,
        fail_user,
        _minor_signup(email="fail@example.test", document="MINOR-4"),
        staged_parental_term_key=fail_key,
    ).status_code == 503
    assert db_session.scalar(select(func.count()).select_from(TournamentSignup)) == 2
    storage.copy_should_fail = False

    term_path = f"/api/tournaments/{event_id}/signups/{number}/parental-term"
    owner_read = client.get(term_path, headers=minor_owner)
    assert owner_read.status_code == 200
    owner_payload = owner_read.json()
    assert owner_payload["download_url"].startswith("https://mock.example/download/")
    assert owner_payload["content_type"] == "application/pdf"
    assert owner_payload["expires_in_seconds"] > 0

    admin = _headers(key, role="admin")
    assert client.get(term_path, headers=admin).status_code == 200
    other = _headers(key, email="other@example.test")
    assert client.get(term_path, headers=other).status_code == 404
    assert client.get(term_path).status_code == 401


def test_owner_reads_payment_instructions_and_pix_stays_private(setup):
    """Only the owner reads Pix and fee instructions. Admins and other athletes get 404."""
    client, key, db_session, _storage = setup
    fixture_pix = "EXAMPLE-FIXTURE-NOT-A-REAL-PIX-DESTINATION"
    event_id = _create_event(
        client,
        key,
        pix_key=fixture_pix,
        inscription_fee_amount="150.00",
        payment_due_at="2027-02-01T23:59:59+00:00",
    )
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id)
    created = _post_signup(client, event_id, owner)
    assert created.status_code == 201, created.text
    number = created.json()["inscription_number"]

    payment_path = f"/api/tournaments/{event_id}/signups/{number}/payment"
    owner_payment = client.get(payment_path, headers=owner)
    assert owner_payment.status_code == 200, owner_payment.text
    payload = owner_payment.json()
    assert payload["inscription_number"] == number
    assert payload["status"] == "awaiting_payment"
    assert payload["inscription_fee_amount"] == "150.00"
    assert payload["payment_due_at"] is not None
    assert payload["payment_options"]["pix"]["pix_key"] == fixture_pix
    assert payload["latest_payment_proof"] is None

    other = _headers(key, email="other@example.test")
    assert client.get(payment_path, headers=other).status_code == 404
    admin = _headers(key, role="admin")
    assert client.get(payment_path, headers=admin).status_code == 404
    assert client.get(payment_path).status_code == 401


def test_payment_instructions_return_null_pix_and_latest_proof_metadata(setup):
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    created = _post_signup(client, event_id, owner)
    number = created.json()["inscription_number"]
    tournament_signup = db_session.scalar(
        select(TournamentSignup).where(TournamentSignup.inscription_number == number)
    )
    db_session.add(
        TournamentSignupFile(
            signup_id=tournament_signup.id,
            kind="payment_proof",
            storage_key=f"tournaments/{event_id}/signups/{tournament_signup.id}/payment_proof/proof-1",
            original_file_name="proof-old.pdf",
            content_type="application/pdf",
            size_bytes=128,
        )
    )
    db_session.add(
        TournamentSignupFile(
            signup_id=tournament_signup.id,
            kind="payment_proof",
            storage_key=f"tournaments/{event_id}/signups/{tournament_signup.id}/payment_proof/proof-2",
            original_file_name="proof-latest.pdf",
            content_type="application/pdf",
            size_bytes=256,
        )
    )
    db_session.commit()

    payment = client.get(
        f"/api/tournaments/{event_id}/signups/{number}/payment",
        headers=owner,
    )
    assert payment.status_code == 200
    body = payment.json()
    assert body["payment_options"]["pix"]["pix_key"] is None
    latest = body["latest_payment_proof"]
    assert latest is not None
    assert latest["original_file_name"] == "proof-latest.pdf"
    assert latest["content_type"] == "application/pdf"
    assert latest["size_bytes"] == 256
    assert latest["submitted_at"] is not None


def test_payment_proof_presigned_submit_replace_and_read(setup):
    """Owner submits proof via staging, moves to payment_in_review, replaces proof, and reads latest only."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key, max_competitor_capacity=1)
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id, email="payer@example.test")
    created = _post_signup(client, event_id, owner, _signup(email="payer@example.test", document="PAY-1"))
    assert created.status_code == 201, created.text
    number = created.json()["inscription_number"]
    tournament_before = db_session.scalar(select(Tournament).where(Tournament.id == event_id))
    serial_before = tournament_before.next_inscription_serial
    capacity_before = tournament_before.max_competitor_capacity

    proof_base = f"/api/tournaments/{event_id}/signups/{number}/payment-proof"
    other = _headers(key, email="other@example.test")
    assert client.post(f"{proof_base}/upload-url", headers=other).status_code == 404

    upload_one = client.post(f"{proof_base}/upload-url", headers=owner)
    assert upload_one.status_code == 200, upload_one.text
    staged_one = upload_one.json()["storage_key"]
    storage.objects[staged_one] = (_pdf_bytes(), "application/pdf")

    submit_one = client.post(
        f"{proof_base}",
        headers=owner,
        json={"storage_key": staged_one, "original_file_name": "proof-one.pdf"},
    )
    assert submit_one.status_code == 200, submit_one.text
    assert submit_one.json()["status"] == "payment_in_review"
    assert staged_one not in storage.objects
    proof_rows = db_session.scalars(
        select(TournamentSignupFile).where(TournamentSignupFile.kind == "payment_proof")
    ).all()
    assert len(proof_rows) == 1
    assert "/payment_proof/" in proof_rows[0].storage_key

    read_one = client.get(f"{proof_base}", headers=owner)
    assert read_one.status_code == 200
    assert read_one.json()["download_url"].startswith("https://mock.example/download/")

    upload_two = client.post(f"{proof_base}/upload-url", headers=owner)
    staged_two = upload_two.json()["storage_key"]
    storage.objects[staged_two] = (_pdf_bytes(b"-2"), "application/pdf")
    submit_two = client.post(
        f"{proof_base}",
        headers=owner,
        json={"storage_key": staged_two, "original_file_name": "proof-two.pdf"},
    )
    assert submit_two.status_code == 200
    assert submit_two.json()["status"] == "payment_in_review"
    proof_rows = db_session.scalars(
        select(TournamentSignupFile)
        .where(TournamentSignupFile.kind == "payment_proof")
        .order_by(TournamentSignupFile.id)
    ).all()
    assert len(proof_rows) == 2

    payment = client.get(
        f"/api/tournaments/{event_id}/signups/{number}/payment",
        headers=owner,
    ).json()
    assert payment["latest_payment_proof"]["original_file_name"] == "proof-two.pdf"

    download_latest = client.get(f"{proof_base}", headers=owner).json()
    assert proof_rows[1].storage_key in download_latest["download_url"]

    tournament_after = db_session.scalar(select(Tournament).where(Tournament.id == event_id))
    assert tournament_after.next_inscription_serial == serial_before
    assert tournament_after.max_competitor_capacity == capacity_before
    assert client.get(f"{proof_base}", headers=other).status_code == 404


def test_payment_proof_rejects_bad_upload_and_wrong_status(setup):
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    created = _post_signup(client, event_id, owner)
    number = created.json()["inscription_number"]
    proof_base = f"/api/tournaments/{event_id}/signups/{number}/payment-proof"

    upload = client.post(f"{proof_base}/upload-url", headers=owner)
    staged_key = upload.json()["storage_key"]
    assert client.post(
        f"{proof_base}",
        headers=owner,
        json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
    ).status_code == 422

    storage.objects[staged_key] = (b"not-a-pdf", "application/pdf")
    assert client.post(
        f"{proof_base}",
        headers=owner,
        json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
    ).status_code == 415
    assert db_session.scalar(select(TournamentSignup)).status == "awaiting_payment"

    storage.objects[staged_key] = (_pdf_bytes(), "application/pdf")
    storage.copy_should_fail = True
    assert client.post(
        f"{proof_base}",
        headers=owner,
        json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
    ).status_code == 503
    storage.copy_should_fail = False
    assert db_session.scalar(select(func.count()).select_from(TournamentSignupFile)) == 0

    tournament_signup = db_session.scalar(select(TournamentSignup))
    tournament_signup.status = "confirmed"
    db_session.commit()
    assert client.post(f"{proof_base}/upload-url", headers=owner).status_code == 409
