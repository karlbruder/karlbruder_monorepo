"""Tournament-owned payment destination settings."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.tournaments.models import TournamentPaymentSettings
from app.tournaments.services.tournament_payment_settings import (
    create_tournament_payment_settings,
    read_registration_pix_key_for_tournament,
)
from app.tournaments.models import Tournament


def test_create_and_read_registration_pix_key(db_session):
    tournament = Tournament(
        name="Payments Fixture",
        slug="payments-fixture",
        starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
        is_internal=False,
    )
    db_session.add(tournament)
    db_session.flush()
    create_tournament_payment_settings(
        db_session,
        tournament.id,
        "  EXAMPLE-FIXTURE-KEY  ",
    )
    db_session.commit()

    assert (
        read_registration_pix_key_for_tournament(db_session, tournament.id)
        == "EXAMPLE-FIXTURE-KEY"
    )
    config_row = db_session.scalar(
        select(TournamentPaymentSettings).where(
            TournamentPaymentSettings.tournament_id == tournament.id
        )
    )
    assert config_row is not None
    assert config_row.pix_key == "EXAMPLE-FIXTURE-KEY"


def test_blank_pix_key_creates_no_payment_rows(db_session):
    tournament = Tournament(
        name="No Pix Fixture",
        slug="no-pix-fixture",
        starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
        is_internal=False,
    )
    db_session.add(tournament)
    db_session.flush()
    create_tournament_payment_settings(db_session, tournament.id, None)
    create_tournament_payment_settings(db_session, tournament.id, "   ")
    db_session.commit()

    assert read_registration_pix_key_for_tournament(db_session, tournament.id) is None
    assert (
        db_session.scalar(
            select(TournamentPaymentSettings).where(
                TournamentPaymentSettings.tournament_id == tournament.id
            )
        )
        is None
    )


def test_payment_settings_allow_only_one_destination_per_tournament(db_session):
    tournament = Tournament(
        name="Single destination",
        slug="single-destination",
        starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
        is_internal=False,
    )
    db_session.add(tournament)
    db_session.flush()
    db_session.add(
        TournamentPaymentSettings(tournament_id=tournament.id, pix_key="FIXTURE-ONE")
    )
    db_session.flush()
    db_session.add(
        TournamentPaymentSettings(tournament_id=tournament.id, pix_key="FIXTURE-TWO")
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
