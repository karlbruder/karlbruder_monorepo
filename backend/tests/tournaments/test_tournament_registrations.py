"""REG-AC-001–010, 014–016: registration ownership, uniqueness, dates, and privacy."""

import os
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select, update


# Settings are built at import time and need the test project URL first.
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

import app.auth.services as auth  # noqa: E402
import app.tournaments.services.tournament_local_dates as tournament_local_dates  # noqa: E402
from app.core.files import FileStorageError, get_file_storage  # noqa: E402
from app.main import karlbruder_app  # noqa: E402
from app.core.files.models import StoredFile  # noqa: E402
from app.tournaments.models import (  # noqa: E402
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)


class StaticJwksClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, _token):
        return SimpleNamespace(key=self.key)


class RecordingFileStorage:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.copy_should_fail = False
        self.object_to_put_before_copy: tuple[bytes, str] | None = None
        self.deleted_keys: list[str] = []

    def create_presigned_put_url(
        self, storage_key: str, *, content_type: str, expires_in: int
    ) -> str:
        return f"https://mock.example/upload/{storage_key}"

    def create_presigned_get_url(
        self, storage_key: str, *, expires_in: int, download_name=None
    ) -> str:
        return f"https://mock.example/download/{storage_key}"

    def head_object(self, storage_key: str) -> tuple[int, str | None]:
        if storage_key not in self.objects:
            raise FileStorageError("Object not found")
        body, content_type = self.objects[storage_key]
        return len(body), content_type

    def read_object_bytes(self, storage_key: str, *, start: int, end: int) -> bytes:
        body, _content_type = self.objects[storage_key]
        return body[start : end + 1]

    def copy_object(
        self, source_storage_key: str, destination_storage_key: str
    ) -> None:
        if self.copy_should_fail:
            raise FileStorageError("Failed to copy object")
        if self.object_to_put_before_copy is not None:
            self.objects[source_storage_key] = self.object_to_put_before_copy
        self.objects[destination_storage_key] = self.objects[source_storage_key]

    def delete_file(self, storage_key: str) -> None:
        self.deleted_keys.append(storage_key)
        self.objects.pop(storage_key, None)

    def store_file(self, storage_key: str, body, content_type: str) -> None:
        payload = body if isinstance(body, bytes) else body.read()
        self.objects[storage_key] = (payload, content_type)

    def read_file(self, storage_key: str) -> tuple[bytes, str]:
        return self.objects[storage_key]


def _post_registration(
    client,
    tournament_id,
    headers,
    registration=None,
    *,
    staged_parental_consent_form_key=None,
    staged_parental_consent_form_name=None,
):
    payload = dict(registration or _registration())
    if staged_parental_consent_form_key is not None:
        payload["parental_consent_form_storage_key"] = staged_parental_consent_form_key
        payload["parental_consent_form_original_file_name"] = (
            staged_parental_consent_form_name or "term.pdf"
        )
    event = client.get(
        f"/api/tournaments/{tournament_id}", headers=headers or {}
    ).json()
    payload.setdefault("acceptance_language", "pt")
    payload.setdefault(
        "acceptance_token",
        event.get("acceptance_tokens", {}).get(
            payload["acceptance_language"], "a" * 64
        ),
    )
    request_kwargs = {"json": payload}
    if headers is not None:
        request_kwargs["headers"] = headers
    return client.post(
        f"/api/tournaments/{tournament_id}/registrations", **request_kwargs
    )


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
        "rules_version": "fixture-rules_text-v1",
        **overrides,
    }


def _registration(*, email="fixture@example.test", document="AB-123", **overrides):
    return {
        "full_name": "Fixture Competitor",
        "birth_date": "2000-01-01",
        "identity_document_type": "passport",
        "identity_document_number": document,
        "email": email,
        "phone": "+55 11 0000-0000",
        "city": "Fixture City",
        "country": "Fixture Country",
        "hema_experience_description": "3 years",
        "previous_tournament_count": 0,
        "emergency_contact_name": "Fixture Contact",
        "emergency_contact_phone": "+55 11 0000-0001",
        "declares_truthful_information": True,
        "declares_has_required_equipment": True,
        "declares_physically_fit": True,
        "accepts_rules": True,
        "accepts_data_processing": True,
        "acknowledges_inherent_risks": True,
        "accepts_cancellation_policy": True,
        "authorizes_image_use": False,
        **overrides,
    }


@pytest.fixture
def setup(monkeypatch, db_session):
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        auth, "get_jwks_client", lambda: StaticJwksClient(key.public_key())
    )
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


def test_self_registration_owner_lookup_admin_listing_and_private_projection(setup):
    """The owner can read their own registration, and staff-only fields stay off that view.

    Another athlete cannot read it. An admin can, including the safety note and the full list.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key, competitor_capacity=0)
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id)
    created = _post_registration(client, event_id, owner)
    assert created.status_code == 201, created.text
    owner_view = created.json()
    number = owner_view["registration_number"]
    assert number.startswith(f"T{event_id}-000001-")
    assert owner_view["registration_status"] == "awaiting_payment"
    assert owner_view["accepted_terms_version"] == "fixture-terms-v1"
    assert owner_view["declares_truthful_information"] is True
    assert owner_view["authorizes_image_use"] is False
    assert {
        "staff_safety_note",
        "accepted_from_ip",
        "user_id",
        "email_normalized",
    }.isdisjoint(owner_view)
    stored = db_session.scalar(select(TournamentRegistration))
    assert stored.user_id == owner_id
    assert stored.acceptances[-1].accepted_from_ip == "testclient"
    assert stored.acceptances[-1].accepted_at is not None
    assert stored.acceptances[-1].declares_truthful_information is True
    assert stored.staff_safety_note is None
    stored.staff_safety_note = "Staff-only fixture"
    db_session.commit()

    detail_path = f"/api/tournaments/{event_id}/registrations/{number}"
    assert client.get(detail_path, headers=owner).json() == owner_view
    other = _headers(key, email="other@example.test")
    assert client.get(detail_path, headers=other).status_code == 404
    assert client.get(detail_path).status_code == 401
    assert (
        client.get(detail_path, headers={"Authorization": "Bearer invalid"}).status_code
        == 401
    )
    assert (
        client.get(detail_path, headers={"Authorization": "Basic invalid"}).status_code
        == 401
    )
    owner_list = client.get(f"/api/tournaments/{event_id}/registrations", headers=owner)
    assert owner_list.status_code == 200
    assert owner_list.json() == [owner_view]
    assert {"staff_safety_note", "accepted_from_ip", "user_id"}.isdisjoint(
        owner_list.json()[0]
    )
    assert client.get(f"/api/tournaments/{event_id}/registrations").status_code == 401
    admin = _headers(key, role="admin")
    staff_view = client.get(detail_path, headers=admin).json()
    assert staff_view["staff_safety_note"] == "Staff-only fixture"
    assert staff_view["accepted_from_ip"] == "testclient"
    assert staff_view["declares_truthful_information"] is True
    assert staff_view["accepted_terms_version"] == "fixture-terms-v1"
    assert staff_view["accepted_at"] == owner_view["accepted_at"]
    assert staff_view["user_id"] == str(owner_id)
    assert client.get(
        f"/api/tournaments/{event_id}/registrations", headers=admin
    ).json() == [staff_view]
    assert "staff_safety_note" not in client.get(detail_path, headers=owner).json()


def test_list_registrations_returns_own_rows_for_participants_and_all_rows_for_admin(
    setup,
):
    """Each participant lists only their registrations. Admins list everyone. Guests get 401."""
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    internal_id = _create_event(client, key, internal=True)
    owner_a_id = uuid4()
    owner_b_id = uuid4()
    owner_a = _headers(key, user_id=owner_a_id, email="a@example.test")
    owner_b = _headers(key, user_id=owner_b_id, email="b@example.test")
    registration_b = _registration(email="b@example.test", document="CD-456")
    created_a = _post_registration(
        client,
        event_id,
        owner_a,
        _registration(email="a@example.test"),
    )
    created_b = _post_registration(client, event_id, owner_b, registration_b)
    assert created_a.status_code == created_b.status_code == 201
    view_a = created_a.json()
    view_b = created_b.json()
    list_path = f"/api/tournaments/{event_id}/registrations"
    assert client.get(list_path, headers=owner_a).json() == [view_a]
    assert client.get(list_path, headers=owner_b).json() == [view_b]
    other_event = _create_event(client, key)
    assert (
        client.get(
            f"/api/tournaments/{other_event}/registrations", headers=owner_a
        ).json()
        == []
    )
    stored = db_session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.registration_number == view_a["registration_number"]
        )
    )
    stored.registration_status = "cancelled"
    db_session.commit()
    cancelled_list = client.get(list_path, headers=owner_a).json()
    assert len(cancelled_list) == 1
    assert cancelled_list[0]["registration_status"] == "cancelled"
    assert {"staff_safety_note", "accepted_from_ip", "user_id"}.isdisjoint(
        cancelled_list[0]
    )
    admin = _headers(key, role="admin")
    admin_rows = client.get(list_path, headers=admin).json()
    assert len(admin_rows) == 2
    assert {row["registration_number"] for row in admin_rows} == {
        view_a["registration_number"],
        view_b["registration_number"],
    }
    assert all(row.get("user_id") for row in admin_rows)
    regular = _headers(key)
    assert (
        client.get(
            f"/api/tournaments/{internal_id}/registrations", headers=regular
        ).status_code
        == 404
    )


def test_priv_002_truthfulness_requires_explicit_json_true_without_creating_row(setup):
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    missing = _registration()
    missing.pop("declares_truthful_information")
    for payload in (
        missing,
        _registration(declares_truthful_information=False),
        _registration(declares_truthful_information=1),
        _registration(declares_truthful_information="true"),
        _registration(declares_truthful_information=None),
    ):
        response = _post_registration(client, event_id, owner, payload)
        assert response.status_code == 422, response.text
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 0
    )


def test_authentication_owner_claims_and_required_input(setup):
    """A registration needs a real bearer token and the account email.

    The client cannot set the owner, status, inscription number, or staff fields. One valid registration is stored.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    assert _post_registration(client, event_id, None).status_code == 401
    assert (
        _post_registration(
            client, event_id, {"Authorization": "Bearer bad"}
        ).status_code
        == 401
    )
    assert (
        _post_registration(client, event_id, {"Authorization": "Basic bad"}).status_code
        == 401
    )
    owner = _headers(key)
    for changes in (
        {"user_id": str(uuid4())},
        {"registration_status": "confirmed"},
        {"registration_number": "chosen"},
        {"accepted_terms_version": "chosen"},
        {"staff_safety_note": "client-supplied"},
        {"full_name": "   "},
        {"identity_document_number": "...--"},
        {"hema_experience_description": None},
        {"previous_tournament_count": -1},
        {"declares_physically_fit": False},
        {"declares_physically_fit": 1},
        {"authorizes_image_use": None},
        {"authorizes_image_use": "false"},
    ):
        response = _post_registration(client, event_id, owner, _registration(**changes))
        assert response.status_code in (400, 422), (changes, response.text)
    assert (
        _post_registration(
            client, event_id, owner, _registration(email="someone-else@example.test")
        ).status_code
        == 400
    )
    assert (
        _post_registration(
            client,
            event_id,
            owner,
            _registration(
                email="F.I.X.T.U.R.E@example.test",
                hema_experience_description=None,
                hema_started_year=2020,
                school_or_team_name="",
                instructor_name="",
                state_or_province="",
                category_or_eligibility_note="",
            ),
        ).status_code
        == 201
    )
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 1
    )


def test_window_staff_closure_and_configured_versions(setup, monkeypatch):
    """Registration is accepted only on the inclusive registration dates.

    Staff closure, missing dates, or missing terms and rules_text versions reject it. An unknown tournament is not found.
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
        assert _post_registration(client, event_id, owner).status_code == expected
    db_session.execute(
        update(TournamentRegistration).values(registration_status="cancelled")
    )
    db_session.commit()
    for today, expected in ((date(2026, 10, 31), 201), (date(2026, 11, 1), 400)):
        monkeypatch.setattr(
            tournament_local_dates,
            "current_local_calendar_date",
            lambda now=None, day=today: day,
        )
        assert (
            _post_registration(
                client, event_id, owner, _registration(document=f"DOC-{today}")
            ).status_code
            == expected
        )
        if expected == 201:
            db_session.execute(
                update(TournamentRegistration).values(registration_status="cancelled")
            )
            db_session.commit()
    monkeypatch.setattr(
        tournament_local_dates,
        "current_local_calendar_date",
        lambda now=None: date(2026, 10, 19),
    )
    for changes in (
        {"is_registration_closed": True},
        {"registration_opens_on": None},
        {"registration_closes_on": None},
        {"terms_version": None},
        {"rules_version": None},
    ):
        event = _create_event(client, key, **changes)
        assert _post_registration(client, event, owner).status_code == 400
    assert _post_registration(client, 99999, owner).status_code == 404


def test_internal_participation_and_tournament_scope(setup):
    """A regular user cannot see or join an internal event. A guild member can.

    An inscription number from one tournament is not found on another.
    """
    client, key, _, _storage = setup
    public_id = _create_event(client, key)
    internal_id = _create_event(client, key, internal=True)
    regular = _headers(key)
    member = _headers(key, role="guild_member")
    assert _post_registration(client, internal_id, regular).status_code == 404
    created = _post_registration(client, internal_id, member)
    assert created.status_code == 201
    number = created.json()["registration_number"]
    assert (
        client.get(
            f"/api/tournaments/{internal_id}/registrations/{number}", headers=regular
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/tournaments/{public_id}/registrations/{number}", headers=member
        ).status_code
        == 404
    )
    assert _post_registration(client, public_id, member).status_code == 201


def test_normalized_duplicates_repeated_create_and_cancelled_replacement(setup):
    """One active registration per person, email, and document, once case and punctuation are ignored.

    Repeating that create conflicts. A cancelled registration can be replaced, and the new number is different.
    """
    client, key, db_session, _storage = setup
    event_id = _create_event(client, key)
    first_user_id = uuid4()
    first = _headers(key, user_id=first_user_id, email="First.User@example.test")
    first_payload = _registration(email="FIRSTUSER@example.test", document="AB-123")
    assert _post_registration(client, event_id, first, first_payload).status_code == 201
    assert _post_registration(client, event_id, first, first_payload).status_code == 409
    assert (
        _post_registration(
            client,
            event_id,
            _headers(key, user_id=first_user_id, email="other@example.test"),
            _registration(email="other@example.test", document="OTHER"),
        ).status_code
        == 409
    )
    assert (
        _post_registration(
            client,
            event_id,
            _headers(key, email="first.user@example.test"),
            _registration(email="first.user@example.test", document="OTHER"),
        ).status_code
        == 409
    )
    assert (
        _post_registration(
            client,
            event_id,
            _headers(key, email="second@example.test"),
            _registration(email="second@example.test", document="a.b 1-2-3"),
        ).status_code
        == 409
    )
    registration = db_session.scalar(select(TournamentRegistration))
    old_number = registration.registration_number
    registration.registration_status = "cancelled"
    db_session.commit()
    replacement = _post_registration(client, event_id, first, first_payload)
    assert replacement.status_code == 201
    assert replacement.json()["registration_number"] != old_number
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 2
    )


def _minor_registration(**overrides):
    return _registration(birth_date="2010-06-01", **overrides)


def test_parental_consent_form_on_create_and_read(setup):
    """Minors need a staged S3 object. Adults must not send a storage key. Reads return presigned URLs."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    pdf_bytes = _pdf_bytes()

    adult_created = _post_registration(client, event_id, owner)
    assert adult_created.status_code == 201
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 0
    )

    upload_url_response = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=owner,
    )
    staged_key = upload_url_response.json()["storage_key"]
    assert (
        _post_registration(
            client,
            event_id,
            owner,
            _registration(),
            staged_parental_consent_form_key=staged_key,
        ).status_code
        == 422
    )

    minor_owner = _headers(key, user_id=uuid4(), email="minor@example.test")
    assert (
        _post_registration(
            client,
            event_id,
            minor_owner,
            _minor_registration(email="minor@example.test", document="MINOR-1"),
        ).status_code
        == 422
    )
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 1
    )

    minor_upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=minor_owner,
    )
    assert minor_upload.status_code == 200
    staged_key = minor_upload.json()["storage_key"]
    storage.objects[staged_key] = (pdf_bytes, "application/pdf")

    minor_created = _post_registration(
        client,
        event_id,
        minor_owner,
        _minor_registration(email="minor@example.test", document="MINOR-1"),
        staged_parental_consent_form_key=staged_key,
        staged_parental_consent_form_name="term.pdf",
    )
    assert minor_created.status_code == 201, minor_created.text
    number = minor_created.json()["registration_number"]
    assert staged_key not in storage.objects
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 1
    )
    final_key = db_session.scalar(
        select(TournamentRegistrationDocument)
    ).file.storage_key
    assert "parental_consent_form" in final_key
    assert "/registrations/" in final_key

    bad_user_id = uuid4()
    bad_user = _headers(key, user_id=bad_user_id, email="bad-type@example.test")
    bad_upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=bad_user,
    )
    bad_key = bad_upload.json()["storage_key"]
    storage.objects[bad_key] = (b"<html>not pdf</html>", "application/pdf")
    assert (
        _post_registration(
            client,
            event_id,
            bad_user,
            _minor_registration(email="bad-type@example.test", document="MINOR-2"),
            staged_parental_consent_form_key=bad_key,
        ).status_code
        == 415
    )

    from app.tournaments.services.registration_uploads import (
        MAX_REGISTRATION_DOCUMENT_BYTES,
    )

    big_user = _headers(key, user_id=uuid4(), email="big@example.test")
    huge_upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=big_user,
    )
    huge_key = huge_upload.json()["storage_key"]
    storage.objects[huge_key] = (
        _pdf_bytes(b"x" * (MAX_REGISTRATION_DOCUMENT_BYTES + 1)),
        "application/pdf",
    )
    assert (
        _post_registration(
            client,
            event_id,
            big_user,
            _minor_registration(email="big@example.test", document="MINOR-3"),
            staged_parental_consent_form_key=huge_key,
        ).status_code
        == 413
    )

    fail_user = _headers(key, user_id=uuid4(), email="fail@example.test")
    fail_upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=fail_user,
    )
    fail_key = fail_upload.json()["storage_key"]
    storage.objects[fail_key] = (pdf_bytes, "application/pdf")
    storage.copy_should_fail = True
    assert (
        _post_registration(
            client,
            event_id,
            fail_user,
            _minor_registration(email="fail@example.test", document="MINOR-4"),
            staged_parental_consent_form_key=fail_key,
        ).status_code
        == 503
    )
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 2
    )
    storage.copy_should_fail = False

    term_path = (
        f"/api/tournaments/{event_id}/registrations/{number}/parental-consent-form"
    )
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
        registration_fee_amount="150.00",
        payment_due_at="2027-02-01T23:59:59+00:00",
    )
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id)
    created = _post_registration(client, event_id, owner)
    assert created.status_code == 201, created.text
    number = created.json()["registration_number"]

    payment_path = f"/api/tournaments/{event_id}/registrations/{number}/payment"
    owner_payment = client.get(payment_path, headers=owner)
    assert owner_payment.status_code == 200, owner_payment.text
    payload = owner_payment.json()
    assert payload["registration_number"] == number
    assert payload["registration_status"] == "awaiting_payment"
    assert payload["registration_fee_amount"] == "150.00"
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
    created = _post_registration(client, event_id, owner)
    number = created.json()["registration_number"]
    tournament_registration = db_session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.registration_number == number
        )
    )
    db_session.add(
        TournamentRegistrationDocument(
            registration_id=tournament_registration.id,
            document_type="payment_proof",
            file=StoredFile(
                storage_key=f"tournaments/{event_id}/registrations/{tournament_registration.id}/payment_proof/proof-1",
                original_file_name="proof-old.pdf",
                content_type="application/pdf",
                size_bytes=128,
            ),
        )
    )
    db_session.add(
        TournamentRegistrationDocument(
            registration_id=tournament_registration.id,
            document_type="payment_proof",
            file=StoredFile(
                storage_key=f"tournaments/{event_id}/registrations/{tournament_registration.id}/payment_proof/proof-2",
                original_file_name="proof-latest.pdf",
                content_type="application/pdf",
                size_bytes=256,
            ),
        )
    )
    db_session.commit()

    payment = client.get(
        f"/api/tournaments/{event_id}/registrations/{number}/payment",
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
    event_id = _create_event(client, key, competitor_capacity=1)
    owner_id = uuid4()
    owner = _headers(key, user_id=owner_id, email="payer@example.test")
    created = _post_registration(
        client,
        event_id,
        owner,
        _registration(email="payer@example.test", document="PAY-1"),
    )
    assert created.status_code == 201, created.text
    number = created.json()["registration_number"]
    tournament_before = db_session.scalar(
        select(Tournament).where(Tournament.id == event_id)
    )
    serial_before = tournament_before.next_registration_number
    capacity_before = tournament_before.competitor_capacity

    proof_base = f"/api/tournaments/{event_id}/registrations/{number}/payment-proof"
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
    assert submit_one.json()["registration_status"] == "payment_in_review"
    assert staged_one not in storage.objects
    proof_rows = db_session.scalars(
        select(TournamentRegistrationDocument).where(
            TournamentRegistrationDocument.document_type == "payment_proof"
        )
    ).all()
    assert len(proof_rows) == 1
    assert "/payment_proof/" in proof_rows[0].file.storage_key

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
    assert submit_two.json()["registration_status"] == "payment_in_review"
    proof_rows = db_session.scalars(
        select(TournamentRegistrationDocument)
        .where(TournamentRegistrationDocument.document_type == "payment_proof")
        .order_by(TournamentRegistrationDocument.id)
    ).all()
    assert len(proof_rows) == 2
    from app.tournaments.models import (
        PaymentProofReview,
        RegistrationPayment,
        RegistrationRefund,
    )

    from app.payments.models import Payment, Refund

    for model in (
        PaymentProofReview,
        RegistrationPayment,
        RegistrationRefund,
        Payment,
        Refund,
    ):
        assert db_session.scalar(select(func.count()).select_from(model)) == 0

    payment = client.get(
        f"/api/tournaments/{event_id}/registrations/{number}/payment",
        headers=owner,
    ).json()
    assert payment["latest_payment_proof"]["original_file_name"] == "proof-two.pdf"

    download_latest = client.get(f"{proof_base}", headers=owner).json()
    assert proof_rows[1].file.storage_key in download_latest["download_url"]

    tournament_after = db_session.scalar(
        select(Tournament).where(Tournament.id == event_id)
    )
    assert tournament_after.next_registration_number == serial_before
    assert tournament_after.competitor_capacity == capacity_before
    assert client.get(f"{proof_base}", headers=other).status_code == 404


def test_payment_proof_rejects_bad_upload_and_wrong_status(setup):
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    created = _post_registration(client, event_id, owner)
    number = created.json()["registration_number"]
    proof_base = f"/api/tournaments/{event_id}/registrations/{number}/payment-proof"

    upload = client.post(f"{proof_base}/upload-url", headers=owner)
    staged_key = upload.json()["storage_key"]
    assert (
        client.post(
            f"{proof_base}",
            headers=owner,
            json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
        ).status_code
        == 422
    )

    storage.objects[staged_key] = (b"not-a-pdf", "application/pdf")
    assert (
        client.post(
            f"{proof_base}",
            headers=owner,
            json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
        ).status_code
        == 415
    )
    assert (
        db_session.scalar(select(TournamentRegistration)).registration_status
        == "awaiting_payment"
    )

    storage.objects[staged_key] = (_pdf_bytes(), "application/pdf")
    storage.copy_should_fail = True
    assert (
        client.post(
            f"{proof_base}",
            headers=owner,
            json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
        ).status_code
        == 503
    )
    storage.copy_should_fail = False
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 0
    )

    tournament_registration = db_session.scalar(select(TournamentRegistration))
    tournament_registration.registration_status = "confirmed"
    db_session.commit()
    assert client.post(f"{proof_base}/upload-url", headers=owner).status_code == 409


def _rejected_promoted_keys(storage) -> list[str]:
    return [
        storage_key
        for storage_key in storage.deleted_keys
        if "/registrations/" in storage_key
    ]


def test_minor_registration_rejects_a_staging_object_replaced_before_copy(setup):
    """Replacing the staged parental consent form before copy returns 413 and creates no registration."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key, email="minor-race@example.test")
    upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=owner,
    )
    assert upload.status_code == 200
    staged_key = upload.json()["storage_key"]
    storage.objects[staged_key] = (_pdf_bytes(), "application/octet-stream")
    from app.tournaments.services.registration_uploads import (
        MAX_REGISTRATION_DOCUMENT_BYTES,
    )

    storage.object_to_put_before_copy = (
        b"MZ" + b"x" * MAX_REGISTRATION_DOCUMENT_BYTES,
        "application/octet-stream",
    )
    rejected = _post_registration(
        client,
        event_id,
        owner,
        _minor_registration(email="minor-race@example.test", document="MINOR-RACE"),
        staged_parental_consent_form_key=staged_key,
    )
    assert rejected.status_code == 413
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 0
    )
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 0
    )
    promoted_keys = _rejected_promoted_keys(storage)
    assert promoted_keys
    assert all(storage_key not in storage.objects for storage_key in promoted_keys)


def test_payment_proof_rejects_a_staging_object_replaced_before_copy(setup):
    """Replacing the staged proof before copy returns 413 and leaves the registration awaiting payment."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    created = _post_registration(client, event_id, owner)
    assert created.status_code == 201
    number = created.json()["registration_number"]
    proof_base = f"/api/tournaments/{event_id}/registrations/{number}/payment-proof"
    upload = client.post(f"{proof_base}/upload-url", headers=owner)
    staged_key = upload.json()["storage_key"]
    storage.objects[staged_key] = (_pdf_bytes(), "application/octet-stream")
    from app.tournaments.services.registration_uploads import (
        MAX_REGISTRATION_DOCUMENT_BYTES,
    )

    storage.object_to_put_before_copy = (
        b"MZ" + b"x" * MAX_REGISTRATION_DOCUMENT_BYTES,
        "application/octet-stream",
    )
    rejected = client.post(
        proof_base,
        headers=owner,
        json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
    )
    assert rejected.status_code == 413
    assert (
        db_session.scalar(select(TournamentRegistration)).registration_status
        == "awaiting_payment"
    )
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 0
    )
    promoted_keys = _rejected_promoted_keys(storage)
    assert promoted_keys
    assert all(storage_key not in storage.objects for storage_key in promoted_keys)


def test_promoted_parental_consent_form_records_the_copied_bytes(setup):
    """The file row stores the copied object size when staging changes after the first inspection."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key, email="minor-copy@example.test")
    upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=owner,
    )
    staged_key = upload.json()["storage_key"]
    storage.objects[staged_key] = (_pdf_bytes(), "application/octet-stream")
    copied_bytes = _pdf_bytes(b"copied-bytes")
    storage.object_to_put_before_copy = (copied_bytes, "application/octet-stream")
    created = _post_registration(
        client,
        event_id,
        owner,
        _minor_registration(email="minor-copy@example.test", document="MINOR-COPY"),
        staged_parental_consent_form_key=staged_key,
    )
    assert created.status_code == 201, created.text
    file_row = db_session.scalar(select(TournamentRegistrationDocument))
    assert file_row.file.content_type == "application/pdf"
    assert file_row.file.size_bytes == len(copied_bytes)
    assert storage.objects[file_row.file.storage_key][0] == copied_bytes


def test_promoted_payment_proof_records_the_copied_bytes(setup):
    """The proof row stores the copied object size when staging changes after the first inspection."""
    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    created = _post_registration(client, event_id, owner)
    assert created.status_code == 201
    number = created.json()["registration_number"]
    proof_base = f"/api/tournaments/{event_id}/registrations/{number}/payment-proof"
    upload = client.post(f"{proof_base}/upload-url", headers=owner)
    staged_key = upload.json()["storage_key"]
    storage.objects[staged_key] = (_pdf_bytes(), "application/octet-stream")
    copied_bytes = _pdf_bytes(b"copied-proof")
    storage.object_to_put_before_copy = (copied_bytes, "application/octet-stream")
    submitted = client.post(
        proof_base,
        headers=owner,
        json={"storage_key": staged_key, "original_file_name": "proof.pdf"},
    )
    assert submitted.status_code == 200, submitted.text
    file_row = db_session.scalar(select(TournamentRegistrationDocument))
    assert file_row.file.content_type == "application/pdf"
    assert file_row.file.size_bytes == len(copied_bytes)
    assert storage.objects[file_row.file.storage_key][0] == copied_bytes


def test_registration_contract_rejects_old_payload_fields_and_exposes_only_new_paths(
    setup,
):
    client, key, _db_session, _storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    assert (
        client.post(
            f"/api/tournaments/{event_id}/signups", json=_registration(), headers=owner
        ).status_code
        == 404
    )
    assert (
        _post_registration(
            client, event_id, owner, _registration(document_id="obsolete")
        ).status_code
        == 422
    )
    created = _post_registration(client, event_id, owner)
    assert created.status_code == 201
    assert created.json()["registration_status"] == "awaiting_payment"
    assert "inscription_number" not in created.json()
    paths = client.get("/api/openapi.json").json()["paths"]
    assert (
        "/api/tournaments/{tournament_id}/registrations/{registration_number}/parental-consent-form"
        in paths
    )
    assert not any("/signups" in path or "/parental-term" in path for path in paths)


def test_concurrent_registration_allocates_distinct_numbers_without_seats(setup):
    """REG-004 and CAP-002: competing creates serialize the counter, even at zero capacity."""
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    from sqlalchemy.orm import Session

    from app.database import engine
    from app.auth.models import User
    from app.tournaments.schemas import RegistrationCreate
    from app.tournaments.services.registration_numbers import (
        is_valid_tournament_registration_number,
    )
    from app.tournaments.services.tournament_registrations import (
        create_tournament_registration,
    )

    barrier = Barrier(2)
    with Session(engine) as session:
        event = Tournament(
            name="Concurrent fixture",
            slug=f"concurrent-{uuid4().hex}",
            starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
            is_internal=False,
            competitor_capacity=0,
            registration_opens_on=date(2026, 10, 1),
            registration_closes_on=date(2026, 10, 31),
            terms_version="fixture-v1",
            rules_version="fixture-v1",
        )
        session.add(event)
        session.commit()
        event_id = event.id
        from app.tournaments.services.registration_acceptances import (
            acceptance_content,
            content_digest,
        )

        token = content_digest(acceptance_content(event, "pt"))

    def create(index):
        email = f"concurrent{index}@example.test"
        user = User(id=uuid4(), email=email)
        payload = RegistrationCreate(
            **_registration(email=email, document=f"CONCURRENT-{index}"),
            acceptance_language="pt",
            acceptance_token=token,
        )
        with Session(engine) as session:
            barrier.wait(timeout=10)
            row = create_tournament_registration(
                session, event_id, user, payload, "127.0.0.1"
            )
            return row.registration_number, row.registration_status

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(create, range(2)))
        numbers = [number for number, _status in results]
        assert len(set(numbers)) == 2
        assert all(
            is_valid_tournament_registration_number(number) for number in numbers
        )
        assert {number.split("-")[1] for number in numbers} == {"000001", "000002"}
        assert [state for _number, state in results] == [
            "awaiting_payment",
            "awaiting_payment",
        ]
        with Session(engine) as session:
            assert session.get(Tournament, event_id).next_registration_number == 3
    finally:
        with engine.begin() as connection:
            from sqlalchemy import text

            connection.execute(
                text(
                    "ALTER TABLE public.registration_acceptances DISABLE TRIGGER immutable_evidence"
                )
            )
            connection.execute(
                text(
                    "DELETE FROM public.registration_acceptances WHERE registration_id IN (SELECT id FROM public.tournament_registrations WHERE tournament_id = :event)"
                ),
                {"event": event_id},
            )
            connection.execute(
                text(
                    "ALTER TABLE public.registration_acceptances ENABLE TRIGGER immutable_evidence"
                )
            )
            connection.execute(
                delete(TournamentRegistration).where(
                    TournamentRegistration.tournament_id == event_id
                )
            )
            connection.execute(delete(Tournament).where(Tournament.id == event_id))


def test_minor_file_metadata_and_document_roll_back_on_database_failure(
    setup, monkeypatch
):
    from sqlalchemy.exc import SQLAlchemyError

    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    upload = client.post(
        f"/api/tournaments/{event_id}/registrations/parental-consent-form/upload-url",
        headers=owner,
    ).json()
    storage.objects[upload["storage_key"]] = (_pdf_bytes(), "application/pdf")

    def fail_after_flushing():
        db_session.flush()
        raise SQLAlchemyError("Fixture database failure")

    monkeypatch.setattr(db_session, "commit", fail_after_flushing)
    with pytest.raises(SQLAlchemyError, match="Fixture database failure"):
        _post_registration(
            client,
            event_id,
            owner,
            _registration(birth_date="2010-06-01"),
            staged_parental_consent_form_key=upload["storage_key"],
        )
    assert db_session.scalar(select(func.count()).select_from(StoredFile)) == 0
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 0
    )
    assert (
        db_session.scalar(select(func.count()).select_from(TournamentRegistration)) == 0
    )
    from app.tournaments.models import RegistrationAcceptance

    assert (
        db_session.scalar(select(func.count()).select_from(RegistrationAcceptance)) == 0
    )
    assert storage.objects == {}


def test_proof_file_metadata_document_and_status_roll_back_on_database_failure(
    setup, monkeypatch
):
    from sqlalchemy.exc import SQLAlchemyError

    client, key, db_session, storage = setup
    event_id = _create_event(client, key)
    owner = _headers(key)
    created = _post_registration(client, event_id, owner).json()
    proof_path = f"/api/tournaments/{event_id}/registrations/{created['registration_number']}/payment-proof"
    upload = client.post(f"{proof_path}/upload-url", headers=owner).json()
    storage.objects[upload["storage_key"]] = (_pdf_bytes(), "application/pdf")

    def fail_after_flushing():
        db_session.flush()
        raise SQLAlchemyError("Fixture database failure")

    monkeypatch.setattr(db_session, "commit", fail_after_flushing)
    with pytest.raises(SQLAlchemyError, match="Fixture database failure"):
        client.post(
            proof_path,
            headers=owner,
            json={
                "storage_key": upload["storage_key"],
                "original_file_name": "proof.pdf",
            },
        )
    assert db_session.scalar(select(func.count()).select_from(StoredFile)) == 0
    assert (
        db_session.scalar(
            select(func.count()).select_from(TournamentRegistrationDocument)
        )
        == 0
    )
    assert (
        db_session.scalar(select(TournamentRegistration)).registration_status
        == "awaiting_payment"
    )
    assert storage.objects == {}


def test_acceptance_preserves_exact_choices_content_and_history(setup):
    from app.tournaments.models import RegistrationAcceptance
    from app.tournaments.schemas import RegistrationCreate
    from app.tournaments.services.registration_acceptances import create_acceptance

    client, key, session, _storage = setup
    event_id = _create_event(
        client,
        key,
        rules_text="First rules",
        cancellation_policy_text="First cancellation policy",
    )
    owner = _headers(key)
    created = _post_registration(client, event_id, owner)
    assert created.status_code == 201
    row = session.scalar(select(TournamentRegistration))
    first = row.acceptances[0]
    assert first.authorizes_image_use is False
    assert first.accepted_by_user_id == row.user_id
    assert first.content["policies"]["rules"]["text"] == "First rules"
    assert (
        first.content["declarations"]["image_use_choices"]["no"]
        == "Não autorizo o uso da minha imagem."
    )
    original_time, original_ip, original_digest = (
        first.accepted_at,
        first.accepted_from_ip,
        first.content_digest,
    )
    event = session.get(Tournament, event_id)
    event.rules_text = "Second rules"
    event.rules_version = "rules-v2"
    event.terms_version = "terms-v2"
    session.commit()
    view = client.get(f"/api/tournaments/{event_id}", headers=owner).json()
    payload = RegistrationCreate(
        **_registration(authorizes_image_use=True),
        acceptance_language="en",
        acceptance_token=view["acceptance_tokens"]["en"],
    )
    second = create_acceptance(event, row.user_id, payload, "192.0.2.8")
    row.acceptances.append(second)
    session.commit()
    session.expire_all()
    snapshots = session.scalars(
        select(RegistrationAcceptance).order_by(RegistrationAcceptance.id)
    ).all()
    assert len(snapshots) == 2
    assert snapshots[0].content["policies"]["rules"]["text"] == "First rules"
    assert (
        snapshots[0].accepted_at,
        snapshots[0].accepted_from_ip,
        snapshots[0].content_digest,
    ) == (original_time, original_ip, original_digest)
    assert snapshots[1].content["policies"]["rules"]["text"] == "Second rules"
    assert (
        snapshots[1].content["declarations"]["accepts_rules"]
        == "I have read and accept the tournament rules."
    )
    response = client.get(
        f"/api/tournaments/{event_id}/registrations/{row.registration_number}",
        headers=owner,
    ).json()
    assert response["authorizes_image_use"] is True
    assert response["accepted_rules_version"] == "rules-v2"
    assert {
        "accepted_from_ip",
        "content",
        "staff_safety_note",
        "accepted_by_user_id",
    }.isdisjoint(response)


@pytest.mark.parametrize("operation", ["orm_update", "sql_update", "sql_delete"])
def test_database_rejects_acceptance_mutation(setup, operation):
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError
    from app.tournaments.models import RegistrationAcceptance

    client, key, session, _storage = setup
    event_id = _create_event(client, key)
    assert _post_registration(client, event_id, _headers(key)).status_code == 201
    with pytest.raises(IntegrityError, match="immutable"):
        with session.begin_nested():
            if operation == "orm_update":
                snapshot = session.scalar(select(RegistrationAcceptance))
                snapshot.authorizes_image_use = True
                session.flush()
            else:
                command = (
                    "UPDATE public.registration_acceptances SET content = '{}'"
                    if operation == "sql_update"
                    else "DELETE FROM public.registration_acceptances"
                )
                session.execute(text(command))
    assert session.scalar(select(RegistrationAcceptance)).authorizes_image_use is False


def test_stale_acceptance_rejects_creation_without_allocating_a_number(setup):
    from app.tournaments.models import RegistrationAcceptance

    client, key, session, _storage = setup
    event_id = _create_event(client, key, rules_text="First version")
    owner = _headers(key)
    token = client.get(f"/api/tournaments/{event_id}", headers=owner).json()[
        "acceptance_tokens"
    ]["pt"]
    event = session.get(Tournament, event_id)
    event.rules_text = "Changed without changing its version label"
    session.commit()
    response = _post_registration(
        client, event_id, owner, _registration(acceptance_token=token)
    )
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "Registration terms changed; refresh before accepting"
    )
    assert session.scalar(select(func.count()).select_from(TournamentRegistration)) == 0
    assert session.scalar(select(func.count()).select_from(RegistrationAcceptance)) == 0
    assert session.get(Tournament, event_id).next_registration_number == 1


def test_archived_policies_survive_source_and_configuration_changes(setup, monkeypatch):
    from app.core.files.models import ArchivedFile
    from app.tournaments.services.policy_fetch import PolicyFetcher, FetchedPolicy
    from app.tournaments.services.tournament_policies import prepare_policy_archives
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    client, key, session, storage = setup
    source = {"body": b"<html>Original policy</html>"}
    monkeypatch.setattr(
        PolicyFetcher,
        "fetch",
        lambda self, url: FetchedPolicy(source["body"], "text/html", url),
    )
    event_id = _create_event(client, key, rules_url="https://policies.example.test/v1")
    owner = _headers(key)
    view = client.get(f"/api/tournaments/{event_id}", headers=owner).json()
    assert view["rules_archive_url"].startswith("https://mock.example/download/")
    assert _post_registration(client, event_id, owner).status_code == 201
    row = session.scalar(select(TournamentRegistration))
    first = row.acceptances[0]
    archive = session.get(ArchivedFile, first.rules_archive_id)
    original_key = archive.file.storage_key
    assert storage.objects[original_key][0] == source["body"]
    source["body"] = b"<html>Replaced source</html>"
    assert storage.objects[original_key][0] == b"<html>Original policy</html>"
    event = session.get(Tournament, event_id)
    event.rules_version = "rules-v2"
    keys = []
    prepare_policy_archives(event, storage, PolicyFetcher(), keys)
    session.commit()
    assert event.rules_archive_id != first.rules_archive_id
    assert storage.objects[original_key][0] == b"<html>Original policy</html>"
    assert original_key not in storage.deleted_keys
    for sql in (
        "UPDATE public.archived_files SET sha256 = 'tampered'",
        "DELETE FROM public.archived_files",
        f"UPDATE public.stored_files SET storage_key = 'tampered' WHERE id = {archive.file_id}",
    ):
        with pytest.raises(IntegrityError, match="immutable"):
            with session.begin_nested():
                session.execute(text(sql))


def test_policy_fetch_failure_cleans_new_objects_and_publishes_no_event(
    setup, monkeypatch
):
    from app.tournaments.exceptions import PolicyArchiveError
    from app.tournaments.services.policy_fetch import PolicyFetcher, FetchedPolicy
    from app.core.files.models import ArchivedFile

    client, key, session, storage = setup

    def fetch(self, url):
        if url.endswith("cancel"):
            raise PolicyArchiveError("Policy document could not be archived")
        return FetchedPolicy(b"%PDF-1.4 fixture", "application/pdf", url)

    monkeypatch.setattr(PolicyFetcher, "fetch", fetch)
    response = client.post(
        "/api/tournaments",
        headers=_headers(key, role="admin"),
        json=_event(
            rules_url="https://policies.example.test/rules",
            cancellation_policy_url="https://policies.example.test/cancel",
        ),
    )
    assert response.status_code == 422
    assert storage.objects == {}
    assert len(storage.deleted_keys) == 1
    assert session.scalar(select(func.count()).select_from(Tournament)) == 0
    assert session.scalar(select(func.count()).select_from(ArchivedFile)) == 0
    assert session.scalar(select(func.count()).select_from(StoredFile)) == 0


@pytest.mark.parametrize("failure", ["store", "database", "download_url"])
def test_policy_archive_failure_rolls_back_metadata_and_cleans_only_new_objects(
    setup, monkeypatch, failure
):
    from sqlalchemy.exc import SQLAlchemyError
    from app.tournaments.services.policy_fetch import PolicyFetcher, FetchedPolicy
    from app.core.files.models import ArchivedFile

    client, key, session, storage = setup
    monkeypatch.setattr(
        PolicyFetcher,
        "fetch",
        lambda self, url: FetchedPolicy(b"%PDF-1.4 fixture", "application/pdf", url),
    )
    # Existing archive objects must survive compensation for a later failed configuration.
    existing_id = _create_event(
        client, key, rules_url="https://policies.example.test/existing"
    )
    existing_key = session.get(Tournament, existing_id).rules_archive.file.storage_key

    def fail(*args, **kwargs):
        raise FileStorageError("Fixture storage failure")

    if failure == "store":
        monkeypatch.setattr(storage, "store_file", fail)
    elif failure == "download_url":
        monkeypatch.setattr(storage, "create_presigned_get_url", fail)
    else:

        def fail_commit():
            session.flush()
            raise SQLAlchemyError("Fixture commit failure")

        monkeypatch.setattr(session, "commit", fail_commit)

    def request():
        return client.post(
            "/api/tournaments",
            headers=_headers(key, role="admin"),
            json=_event(rules_url="https://policies.example.test/new"),
        )

    if failure == "database":
        with pytest.raises(SQLAlchemyError, match="Fixture commit failure"):
            request()
    else:
        assert request().status_code == 503
    assert session.scalar(select(func.count()).select_from(Tournament)) == 1
    assert session.scalar(select(func.count()).select_from(ArchivedFile)) == 1
    assert session.scalar(select(func.count()).select_from(StoredFile)) == 1
    assert existing_key in storage.objects
    assert existing_key not in storage.deleted_keys
    assert set(storage.objects) == {existing_key}


@pytest.mark.parametrize("refund_status", ["awaiting_refund", "completed"])
def test_paid_cancellation_allows_replacement_while_refund_remains_independent(
    setup, refund_status
):
    """REG-004 and PAY-009: stored refund facts never reactivate cancelled participation."""
    from decimal import Decimal
    from app.tournaments.models import (
        PaymentProofReview,
        RegistrationPayment,
        RegistrationRefund,
    )

    client, key, session, _storage = setup
    event_id = _create_event(client, key, registration_fee_amount="100.00")
    owner = _headers(key)
    first = _post_registration(client, event_id, owner).json()
    original = session.scalar(select(TournamentRegistration))
    document = TournamentRegistrationDocument(
        registration_id=original.id,
        document_type="payment_proof",
        file=StoredFile(
            storage_key=f"fixture/{uuid4()}",
            original_file_name="proof.pdf",
            content_type="application/pdf",
            size_bytes=128,
        ),
    )
    session.add(document)
    session.flush()
    now = datetime.now(UTC)
    review = PaymentProofReview(
        document_id=document.id,
        decision="approved",
        reviewed_by_user_id=uuid4(),
        reviewed_at=now,
    )
    session.add(review)
    session.flush()
    from app.payments.services.records import add_payment_record, add_refund_record

    receipt = add_payment_record(
        session,
        amount_received=Decimal("125.50"),
        verified_by_user_id=uuid4(),
        verified_at=now,
    )
    payment = RegistrationPayment(
        registration_id=original.id, proof_review_id=review.id, payment_id=receipt.id
    )
    session.add(payment)
    session.flush()
    original.registration_status = "cancelled"
    shared_refund = add_refund_record(
        session,
        payment_id=receipt.id,
        amount_owed=receipt.amount_received,
        obligated_at=now,
    )
    if refund_status == "completed":
        shared_refund.refund_status = "completed"
        shared_refund.completed_at = now
        shared_refund.completed_by_user_id = uuid4()
    refund = RegistrationRefund(
        registration_payment_id=payment.id,
        refund=shared_refund,
        due_on=now.date() + timedelta(days=14),
    )
    session.add(refund)
    session.commit()
    replacement = _post_registration(client, event_id, owner)
    assert replacement.status_code == 201, replacement.text
    assert replacement.json()["registration_number"] != first["registration_number"]
    assert replacement.json()["registration_status"] == "awaiting_payment"
    assert (
        session.get(TournamentRegistration, original.id).registration_status
        == "cancelled"
    )
    assert (
        session.get(RegistrationRefund, refund.id).refund.refund_status == refund_status
    )
    assert refund.refund.amount_owed == Decimal("125.50")
