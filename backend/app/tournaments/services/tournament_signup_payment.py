"""Owner payment instructions for a tournament registration."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.payments.services.tournament_inscription_payment import (
    read_inscription_pix_key_for_tournament,
)
from app.tournaments.models import Tournament, TournamentSignup, TournamentSignupFile
from app.tournaments.services.tournament_signups import visible_tournament


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
