"""Prepare fixture accounts and tournaments, then emit metadata for Playwright."""

import json

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.main  # noqa: F401  # Register all mapped models.
from config import settings
from seeds.accounts import seed_accounts
from seeds.cancellation_refunds import seed_cancellation_refunds
from seeds.tournaments import seed_tournaments


def main() -> None:
    accounts = seed_accounts()
    engine = create_engine(settings.get_database_url())
    try:
        with Session(engine) as session:
            fixtures = seed_tournaments(session, accounts)
            fixtures['cancellationRefunds'] = seed_cancellation_refunds(session, accounts)
            print(json.dumps(fixtures))
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
