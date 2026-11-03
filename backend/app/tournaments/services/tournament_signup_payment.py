"""Owner payment instructions and payment proof uploads for a tournament registration."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.services.storage import FileStorage, FileStorageError
from app.models import User
from app.payments.services.tournament_inscription_payment import (
    read_inscription_pix_key_for_tournament,
)
from app.tournaments.models import Tournament, TournamentSignup, TournamentSignupFile
from app.tournaments.services.tournament_signup_files import (
    create_payment_proof_download_url,
    create_payment_proof_upload_url,
    delete_storage_object_quietly,
    inspect_staged_payment_proof_upload,
    promote_staged_payment_proof_to_signup,
    validate_staged_payment_proof_storage_key,
)
from app.tournaments.services.tournament_signups import visible_tournament

_PAYMENT_PROOF_UPLOAD_STATUSES = frozenset({"awaiting_payment", "payment_in_review"})


def load_owner_tournament_signup(
    session: Session,
    tournament_id: int,
    inscription_number: str,
    user: User,
) -> TournamentSignup:
    visible_tournament(session, tournament_id, user)
    tournament_signup = session.scalar(
        select(TournamentSignup).where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.inscription_number == inscription_number,
        )
    )
    if tournament_signup is None or tournament_signup.user_id != user.id:
        raise HTTPException(status_code=404, detail="Registration not found")
    return tournament_signup


def create_tournament_signup_payment_proof_upload_url(
    session: Session,
    tournament_id: int,
    inscription_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int, dict[str, str]]:
    tournament_signup = load_owner_tournament_signup(
        session, tournament_id, inscription_number, user
    )
    if tournament_signup.status not in _PAYMENT_PROOF_UPLOAD_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Payment proof cannot be submitted for this registration status",
        )
    return create_payment_proof_upload_url(file_storage, tournament_id, user)


def submit_tournament_signup_payment_proof(
    session: Session,
    tournament_id: int,
    inscription_number: str,
    user: User,
    *,
    storage_key: str,
    original_file_name: str,
    file_storage: FileStorage,
) -> TournamentSignup:
    visible_tournament(session, tournament_id, user)
    tournament_signup = session.scalar(
        select(TournamentSignup)
        .where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.inscription_number == inscription_number,
        )
        .with_for_update()
    )
    if tournament_signup is None or tournament_signup.user_id != user.id:
        raise HTTPException(status_code=404, detail="Registration not found")
    if tournament_signup.status not in _PAYMENT_PROOF_UPLOAD_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Payment proof cannot be submitted for this registration status",
        )
    normalized_file_name = original_file_name.strip()
    if not normalized_file_name:
        raise HTTPException(status_code=422, detail="Payment proof original file name is required")

    validate_staged_payment_proof_storage_key(storage_key, tournament_id, user.id)
    content_type, size_bytes = inspect_staged_payment_proof_upload(file_storage, storage_key)

    final_storage_key: str | None = None
    try:
        final_storage_key = promote_staged_payment_proof_to_signup(
            file_storage,
            staged_storage_key=storage_key,
            tournament_id=tournament_id,
            signup_id=tournament_signup.id,
        )
        session.add(
            TournamentSignupFile(
                signup_id=tournament_signup.id,
                kind="payment_proof",
                storage_key=final_storage_key,
                original_file_name=normalized_file_name,
                content_type=content_type,
                size_bytes=size_bytes,
            )
        )
        if tournament_signup.status == "awaiting_payment":
            tournament_signup.status = "payment_in_review"
        session.commit()
    except FileStorageError as error:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        raise HTTPException(status_code=503, detail="File storage unavailable") from error

    session.refresh(tournament_signup)
    return tournament_signup


def read_tournament_signup_payment_proof_download(
    session: Session,
    tournament_id: int,
    inscription_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int]:
    tournament_signup = load_owner_tournament_signup(
        session, tournament_id, inscription_number, user
    )
    latest_proof_row = session.scalar(
        select(TournamentSignupFile)
        .where(
            TournamentSignupFile.signup_id == tournament_signup.id,
            TournamentSignupFile.kind == "payment_proof",
        )
        .order_by(TournamentSignupFile.id.desc())
        .limit(1)
    )
    if latest_proof_row is None:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    return create_payment_proof_download_url(file_storage, latest_proof_row.storage_key)


def read_tournament_signup_payment_instructions(
    session: Session,
    tournament_id: int,
    inscription_number: str,
    user: User,
):
    """Return payment instructions for the tournament registration owner only."""

    from app.tournaments.schemas import (
        PixPaymentOptionRead,
        TournamentSignupPaymentInstructionsRead,
        TournamentSignupPaymentOptionsRead,
        TournamentSignupPaymentProofSummaryRead,
    )

    visible_tournament(session, tournament_id, user)
    tournament_signup = session.scalar(
        select(TournamentSignup).where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.inscription_number == inscription_number,
        )
    )
    if tournament_signup is None or tournament_signup.user_id != user.id:
        raise HTTPException(status_code=404, detail="Registration not found")
    tournament = session.scalar(select(Tournament).where(Tournament.id == tournament_id))
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    latest_proof_row = session.scalar(
        select(TournamentSignupFile)
        .where(
            TournamentSignupFile.signup_id == tournament_signup.id,
            TournamentSignupFile.kind == "payment_proof",
        )
        .order_by(TournamentSignupFile.id.desc())
        .limit(1)
    )
    latest_payment_proof = None
    if latest_proof_row is not None:
        latest_payment_proof = TournamentSignupPaymentProofSummaryRead(
            original_file_name=latest_proof_row.original_file_name,
            content_type=latest_proof_row.content_type,
            size_bytes=latest_proof_row.size_bytes,
            submitted_at=latest_proof_row.created_at,
        )
    inscription_pix_key = read_inscription_pix_key_for_tournament(session, tournament_id)
    return TournamentSignupPaymentInstructionsRead(
        inscription_number=tournament_signup.inscription_number,
        status=tournament_signup.status,
        inscription_fee_amount=tournament.inscription_fee_amount,
        payment_due_at=tournament.payment_due_at,
        payment_options=TournamentSignupPaymentOptionsRead(
            pix=PixPaymentOptionRead(pix_key=inscription_pix_key),
        ),
        latest_payment_proof=latest_payment_proof,
    )
