"""Create the isolated rejected payment proof resubmission journey."""

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.auth.models import User
from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentPaymentSettings, TournamentProduct
from app.tournaments.schemas import RegistrationCreate
from app.tournaments.services.registration_acceptances import build_registration_acceptance_content, calculate_registration_acceptance_digest
from app.tournaments.services.tournament_registrations import create_tournament_registration


def seed_payment_resubmission(session: Session, accounts: dict) -> dict:
    now = datetime.now(UTC)
    today = now.astimezone(timezone(timedelta(hours=-3))).date()
    event = Tournament(name='E2E Proof Resubmission', slug='e2e-proof-resubmission', starts_at=now + timedelta(days=30),
        registration_opens_on=today - timedelta(days=1), registration_closes_on=today + timedelta(days=10),
        competitor_capacity=1, location='Fixture venue')
    product = Product(name='E2E resubmission entry', description='Synthetic tournament entry')
    session.add_all([event, product])
    session.flush()
    option = TournamentProduct(tournament_id=event.id, product_id=product.id)
    price = Price(product_id=product.id, amount=Decimal('100.00'))
    session.add_all([option, price, TournamentPaymentSettings(tournament_id=event.id, pix_key='resubmission@example.test')])
    session.flush()
    owner = User(id=accounts['resubmission-owner']['id'], email=accounts['resubmission-owner']['email'], app_metadata={'karlbruder_role': 'regular_user'})
    payload = RegistrationCreate(
        tournament_product_id=option.id, price_id=price.id,
        acceptance_language='pt', acceptance_token=calculate_registration_acceptance_digest(build_registration_acceptance_content(event, 'pt')),
        full_name='Fixture Resubmission Owner', birth_date='2000-01-01', identity_document_type='passport',
        identity_document_number='E2E-RESUBMISSION', email=owner.email, phone='+55 11 0000-0000',
        city='Fixture City', country='Brazil', hema_experience_description='3 years', previous_tournament_count=0,
        emergency_contact_name='Fixture Contact', emergency_contact_phone='+55 11 0000-0001',
        declares_truthful_information=True, declares_has_required_equipment=True, declares_physically_fit=True,
        accepts_rules=True, accepts_data_processing=True, acknowledges_inherent_risks=True, accepts_cancellation_policy=True,
    )
    registration = create_tournament_registration(session, event.id, owner, payload, '127.0.0.1')
    return {'tournament_id': event.id, 'registration_number': registration.registration_number, 'staff_id': accounts['resubmission-staff']['id']}
