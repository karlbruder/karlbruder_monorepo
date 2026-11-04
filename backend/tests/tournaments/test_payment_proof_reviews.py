"""ADM-AC-002 and AUTH-AC-006: global staff evidence access and privacy."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.core.files.models import StoredFile
from app.tournaments.models import (
    PaymentProofReview,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.services.payment_proof_reviews import (
    list_payment_reviews,
    read_payment_review,
    read_payment_review_document,
)
from tests.tournaments.test_tournament_registrations import (
    setup as registration_setup,
    _create_event,
    _headers,
    _post_registration,
)

@pytest.fixture(name="setup")
def staff_review_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


BASE = "/api/staff/tournaments/payment-reviews"


def _pending(setup, *, internal=False):
    client, key, session, storage = setup
    tournament_id = _create_event(client, key, internal=internal)
    response = _post_registration(
        client,
        tournament_id,
        _headers(key, role="guild_member" if internal else "regular_user"),
    )
    assert response.status_code == 201, response.text
    number = response.json()["registration_number"]
    registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.registration_number == number
        )
    )
    registration.registration_status = "payment_in_review"
    documents = []
    for index in range(2):
        storage_key = f"fixture/{uuid4()}.pdf"
        storage.objects[storage_key] = (b"%PDF-1.4", "application/pdf")
        document = TournamentRegistrationDocument(
            registration_id=registration.id,
            document_type="payment_proof",
            file=StoredFile(
                storage_key=storage_key,
                original_file_name=f"proof-{index}.pdf",
                content_type="application/pdf",
                size_bytes=8,
            ),
        )
        session.add(document)
        documents.append(document)
    session.flush()
    return registration, documents


@pytest.mark.parametrize(
    "suffix", ["", "/unknown", "/unknown/documents/1/download-url"]
)
def test_staff_routes_require_authenticated_admin(setup, suffix):
    client, key, _session, _storage = setup
    assert client.get(BASE + suffix).status_code == 401
    for role in ("regular_user", "guild_member"):
        assert (
            client.get(BASE + suffix, headers=_headers(key, role=role)).status_code
            == 403
        )


def test_services_reject_editable_admin_metadata_before_reading_records(setup):
    _client, _key, session, storage = setup
    user = User(id=uuid4(), user_metadata={"karlbruder_role": "admin"})
    for operation in (
        lambda: list_payment_reviews(session, user),
        lambda: read_payment_review(session, user, "unknown"),
        lambda: read_payment_review_document(session, user, "unknown", 1, storage),
    ):
        with pytest.raises(AdminAccessRequiredException):
            operation()


def test_queue_pages_across_tournaments_and_excludes_decided_latest_proofs(setup):
    client, key, session, _storage = setup
    first, first_documents = _pending(setup)
    second, second_documents = _pending(setup, internal=True)
    headers = _headers(key, role="admin")
    response = client.get(BASE, headers=headers, params={"limit": 1, "offset": 1})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 2
    assert body["items"][0]["registration_number"] == second.registration_number
    assert set(body["items"][0]) == {
        "registration_number",
        "tournament_id",
        "tournament_name",
        "full_name",
        "registration_status",
        "document_id",
        "submitted_at",
    }
    filtered = client.get(
        BASE, headers=headers, params={"registration_number": first.registration_number}
    ).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["document_id"] == first_documents[-1].id
    session.add(
        PaymentProofReview(
            document_id=second_documents[-1].id,
            decision="rejected",
            rejection_reason="Unreadable",
            reviewed_by_user_id=uuid4(),
            reviewed_at=datetime.now(UTC),
        )
    )
    session.flush()
    assert client.get(BASE, headers=headers).json()["total"] == 1
    assert (
        client.get(
            BASE, headers=headers, params={"registration_number": "missing"}
        ).json()["items"]
        == []
    )
    assert client.get(BASE, headers=headers, params={"limit": 0}).status_code == 422


def test_detail_retains_history_and_download_checks_registration_association(setup):
    client, key, session, storage = setup
    registration, documents = _pending(setup)
    other, other_documents = _pending(setup)
    headers = _headers(key, role="admin")
    path = f"{BASE}/{registration.registration_number}"
    session.add(
        PaymentProofReview(
            document_id=documents[0].id,
            decision="rejected",
            rejection_reason="Unreadable",
            reviewed_by_user_id=uuid4(),
            reviewed_at=datetime.now(UTC),
        )
    )
    session.flush()
    response = client.get(path, headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["latest_document_id"] == documents[-1].id
    assert [item["id"] for item in body["documents"]] == [
        doc.id for doc in reversed(documents)
    ]
    assert body["reviews"][0]["rejection_reason"] == "Unreadable"
    assert "storage_key" not in response.text
    for document in documents:
        assert (
            client.get(
                f"{path}/documents/{document.id}/download-url", headers=headers
            ).status_code
            == 200
        )
    assert (
        client.get(
            f"{path}/documents/{other_documents[0].id}/download-url", headers=headers
        ).status_code
        == 404
    )
    assert client.get(f"{BASE}/missing", headers=headers).status_code == 404
    storage.objects.pop(documents[0].file.storage_key)
    assert (
        client.get(
            f"{path}/documents/{documents[0].id}/download-url", headers=headers
        ).status_code
        == 503
    )


def test_parental_form_is_visible_to_staff_and_missing_proof_has_no_queue_entry(setup):
    client, key, session, storage = setup
    registration, documents = _pending(setup)
    storage_key = f"fixture/{uuid4()}.pdf"
    storage.objects[storage_key] = (b"%PDF-1.4", "application/pdf")
    form = TournamentRegistrationDocument(
        registration_id=registration.id,
        document_type="parental_consent_form",
        file=StoredFile(
            storage_key=storage_key,
            original_file_name="term.pdf",
            content_type="application/pdf",
            size_bytes=8,
        ),
    )
    session.add(form)
    session.flush()
    headers = _headers(key, role="admin")
    path = f"{BASE}/{registration.registration_number}"
    body = client.get(path, headers=headers).json()
    assert body["latest_document_id"] == documents[-1].id
    assert body["documents"][0]["document_type"] == "parental_consent_form"
    assert (
        client.get(
            f"{path}/documents/{form.id}/download-url", headers=headers
        ).status_code
        == 200
    )
    assert (
        client.get(f"{path}/documents/999999/download-url", headers=headers).status_code
        == 404
    )
    owner = _headers(key, user_id=registration.user_id)
    owner_path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/payment-proof"
    owner_response = client.get(owner_path, headers=owner)
    assert owner_response.status_code == 200
    assert documents[-1].file.storage_key in owner_response.json()["download_url"]
    assert (
        client.get(
            f"{path}/documents/{documents[0].id}/download-url", headers=owner
        ).status_code
        == 403
    )
    event_id = _create_event(client, key)
    response = _post_registration(client, event_id, _headers(key))
    number = response.json()["registration_number"]
    empty = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.registration_number == number
        )
    )
    empty.registration_status = "payment_in_review"
    session.flush()
    assert (
        client.get(
            BASE, headers=headers, params={"registration_number": number}
        ).json()["total"]
        == 0
    )
    assert (
        client.get(f"{BASE}/{number}", headers=headers).json()["latest_document_id"]
        is None
    )
