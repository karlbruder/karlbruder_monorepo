"""Tournament inscription payment configuration services."""

from datetime import UTC, datetime

from sqlalchemy import select

from app.payments.models import PixRecipient, TournamentInscriptionPaymentConfig
from app.payments.services.tournament_inscription_payment import (
    create_tournament_inscription_payment_config,
    read_inscription_pix_key_for_tournament,
)
from app.tournaments.models import Tournament


def test_create_and_read_inscription_pix_key(db_session):
    tournament = Tournament(
        name="Payments Fixture",
        slug="payments-fixture",
        starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
        is_internal=False,
    )
    db_session.add(tournament)
    db_session.flush()
    create_tournament_inscription_payment_config(
        db_session,
        tournament.id,
        "  EXAMPLE-FIXTURE-KEY  ",
    )
    db_session.commit()

    assert (
        read_inscription_pix_key_for_tournament(db_session, tournament.id)
        == "EXAMPLE-FIXTURE-KEY"
    )
    config_row = db_session.scalar(
        select(TournamentInscriptionPaymentConfig).where(
            TournamentInscriptionPaymentConfig.tournament_id == tournament.id
        )
    )
    assert config_row is not None
    pix_recipient = db_session.get(PixRecipient, config_row.pix_recipient_id)
    assert pix_recipient is not None
    assert pix_recipient.pix_key == "EXAMPLE-FIXTURE-KEY"


def test_blank_pix_key_creates_no_payment_rows(db_session):
    tournament = Tournament(
        name="No Pix Fixture",
        slug="no-pix-fixture",
        starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
        is_internal=False,
    )
    db_session.add(tournament)
    db_session.flush()
    create_tournament_inscription_payment_config(db_session, tournament.id, None)
    create_tournament_inscription_payment_config(db_session, tournament.id, "   ")
    db_session.commit()

    assert read_inscription_pix_key_for_tournament(db_session, tournament.id) is None
    assert (
        db_session.scalar(
            select(TournamentInscriptionPaymentConfig).where(
                TournamentInscriptionPaymentConfig.tournament_id == tournament.id
            )
        )
        is None
    )
