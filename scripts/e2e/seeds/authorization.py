"""Create isolated private-record and catalog authorization fixtures."""

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import boto3
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.files.models import StoredFile
from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentPaymentSettings, TournamentProduct, TournamentRegistrationDocument
from app.tournaments.schemas import RegistrationCreate
from app.tournaments.services.registration_acceptances import build_registration_acceptance_content, calculate_registration_acceptance_digest
from app.tournaments.services.tournament_registrations import create_tournament_registration
from config import settings


def seed_authorization(session: Session, accounts: dict) -> dict:
    now = datetime.now(UTC)
    today = now.astimezone(timezone(timedelta(hours=-3))).date()
    offerings = {}
    for slug in ('private-owner', 'private-other', 'internal'):
        tournament = Tournament(name=f'E2E Authorization {slug}', slug=f'e2e-authorization-{slug}',
            starts_at=now + timedelta(days=30), registration_opens_on=today - timedelta(days=1),
            registration_closes_on=today + timedelta(days=10), competitor_capacity=3,
            location='Fixture venue', is_internal=slug == 'internal')
        product = Product(name=f'Authorization entry {slug}', description='Synthetic entry')
        session.add_all([tournament, product])
        session.flush()
        option = TournamentProduct(tournament_id=tournament.id, product_id=product.id)
        price = Price(product_id=product.id, amount=Decimal('100.00'))
        session.add_all([option, price, TournamentPaymentSettings(tournament_id=tournament.id, pix_key='fixture@example.test')])
        session.flush()
        offerings[slug] = (tournament, option, price)
    session.commit()

    registrations = {}
    for slug, account_name in [('private-owner', 'authorization-owner'), ('private-other', 'authorization-other')]:
        event, option, price = offerings[slug]
        account = accounts[account_name]
        user = User(id=account['id'], email=account['email'], app_metadata={'karlbruder_role': 'regular_user'})
        payload = RegistrationCreate(
            tournament_product_id=option.id, price_id=price.id, acceptance_language='pt',
            acceptance_token=calculate_registration_acceptance_digest(build_registration_acceptance_content(event, 'pt')),
            full_name=f'Fixture {account_name}', birth_date='2000-01-01', identity_document_type='passport',
            identity_document_number=f'E2E-{account_name}', email=user.email, phone='+55 11 0000-0000',
            city='Fixture City', country='Brazil', hema_experience_description='3 years', previous_tournament_count=0,
            emergency_contact_name='Fixture Contact', emergency_contact_phone='+55 11 0000-0001',
            declares_truthful_information=True, declares_has_required_equipment=True, declares_physically_fit=True,
            accepts_rules=True, accepts_data_processing=True, acknowledges_inherent_risks=True, accepts_cancellation_policy=True,
        )
        registrations[slug] = create_tournament_registration(session, event.id, user, payload, '127.0.0.1')
    owner = registrations['private-owner']
    owner.staff_safety_note = 'E2E-PRIVATE-SAFETY-SENTINEL'
    owner.registration_status = 'awaiting_payment_confirmation'
    contents = b'%PDF-1.4\n% synthetic authorization proof\n%%EOF\n'
    key = 'fixtures/authorization-private-proof.pdf'
    boto3.client('s3', endpoint_url=settings.S3_ENDPOINT_URL, region_name='us-east-2').put_object(
        Bucket=settings.S3_BUCKET_NAME, Key=key, Body=contents, ContentType='application/pdf')
    document = TournamentRegistrationDocument(registration_id=owner.id, document_type='payment_proof',
        file=StoredFile(storage_key=key, original_file_name='authorization-private-proof.pdf',
                        content_type='application/pdf', size_bytes=len(contents)))
    session.add(document)
    session.commit()
    return {
        'owner_tournament_id': offerings['private-owner'][0].id,
        'other_tournament_id': offerings['private-other'][0].id,
        'internal_tournament_id': offerings['internal'][0].id,
        'owner_registration_number': owner.registration_number,
        'other_registration_number': registrations['private-other'].registration_number,
        'document_id': document.id,
        'accounts': {name: accounts[f'authorization-{name}']['id'] for name in ('owner', 'other', 'member', 'admin')},
    }
