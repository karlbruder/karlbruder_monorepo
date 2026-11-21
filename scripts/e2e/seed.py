"""Seed disposable Auth accounts and tournament data for browser tests."""
import json
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.main  # noqa: F401  # Register all mapped models.
from app.auth.models import User
from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentPaymentSettings, TournamentProduct
from app.tournaments.schemas import RegistrationCreate
from app.tournaments.services.registration_acceptances import (
    build_registration_acceptance_content,
    calculate_registration_acceptance_digest,
)
from app.tournaments.services.tournament_registrations import create_tournament_registration
from config import settings

PASSWORD = 'E2e-fixture-password-2026!'
accounts = {}
with httpx.Client(base_url=settings.issuer, timeout=10, trust_env=True) as auth:
    for name, role in [('participant', 'regular_user'), ('owner', 'regular_user'), ('staff', 'admin')]:
        email = f'{name}@example.test'
        response = auth.post('admin/users', headers={'Authorization': f'Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}'}, json={
            'email': email, 'password': PASSWORD, 'email_confirm': True,
            'app_metadata': {'karlbruder_role': role},
        })
        response.raise_for_status()
        account = response.json()
        token_response = auth.post('token?grant_type=password', json={'email': email, 'password': PASSWORD})
        token_response.raise_for_status()
        token = token_response.json()['access_token']
        me = httpx.get('http://localhost:8000/api/users/me', headers={'Authorization': f'Bearer {token}'}, timeout=10, trust_env=False)
        me.raise_for_status()
        assert me.json()['id'] == account['id']
        assert me.json()['app_metadata']['karlbruder_role'] == role
        accounts[name] = account

now = datetime.now(UTC)
today = now.astimezone(timezone(timedelta(hours=-3))).date()
engine = create_engine(settings.get_database_url())
with Session(engine) as session:
    offerings = []
    for slug, name in [('registration', 'E2E Registration'), ('payment', 'E2E Payment')]:
        tournament = Tournament(name=name, slug=f'e2e-{slug}', starts_at=now + timedelta(days=30),
            registration_opens_on=today - timedelta(days=1), registration_closes_on=today + timedelta(days=10),
            competitor_capacity=1, location='Fixture venue')
        product = Product(name='E2E entry', description='Synthetic tournament entry')
        session.add_all([tournament, product])
        session.flush()
        option = TournamentProduct(tournament_id=tournament.id, product_id=product.id)
        price = Price(product_id=product.id, amount=Decimal('100.00'))
        session.add_all([option, price, TournamentPaymentSettings(tournament_id=tournament.id, pix_key='fixture@example.test')])
        session.flush()
        offerings.append((tournament, option, price))
    session.commit()
    event, option, price = offerings[1]
    owner = User(id=accounts['owner']['id'], email=accounts['owner']['email'], app_metadata={'karlbruder_role': 'regular_user'})
    payload = RegistrationCreate(
        tournament_product_id=option.id, price_id=price.id,
        acceptance_language='pt', acceptance_token=calculate_registration_acceptance_digest(build_registration_acceptance_content(event, 'pt')),
        full_name='Fixture Owner', birth_date='2000-01-01', identity_document_type='passport',
        identity_document_number='E2E-OWNER', email=owner.email, phone='+55 11 0000-0000',
        city='Fixture City', country='Brazil', hema_experience_description='3 years', previous_tournament_count=0,
        emergency_contact_name='Fixture Contact', emergency_contact_phone='+55 11 0000-0001',
        declares_truthful_information=True, declares_has_required_equipment=True, declares_physically_fit=True,
        accepts_rules=True, accepts_data_processing=True, acknowledges_inherent_risks=True, accepts_cancellation_policy=True,
    )
    registration = create_tournament_registration(session, event.id, owner, payload, '127.0.0.1')
    print(json.dumps({'registration_tournament_id': offerings[0][0].id, 'payment_tournament_id': event.id,
        'payment_registration_number': registration.registration_number, 'staff_id': accounts['staff']['id']}))
