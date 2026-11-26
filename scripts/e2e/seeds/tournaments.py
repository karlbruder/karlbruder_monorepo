"""Create isolated tournament fixtures for registration, payment, and waitlist journeys."""

import hashlib
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import boto3
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.files.models import ArchivedFile, StoredFile
from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentDocument, TournamentDocumentVersion, TournamentPaymentSettings, TournamentProduct
from app.tournaments.schemas import RegistrationCreate
from app.tournaments.services.registration_acceptances import (
    build_registration_acceptance_content,
    calculate_registration_acceptance_digest,
)
from app.tournaments.services.tournament_registrations import create_tournament_registration
from config import settings


def _add_refundable_policy(session: Session, tournament: Tournament, now: datetime) -> None:
    tournament.refunds_allowed = True
    policy = b"%PDF-1.4\n% synthetic cancellation policy\n%%EOF\n"
    key = 'fixtures/waitlist-cancellation-policy.pdf'
    s3 = boto3.client('s3', endpoint_url=settings.S3_ENDPOINT_URL, region_name='us-east-2')
    s3.put_object(Bucket=settings.S3_BUCKET_NAME, Key=key, Body=policy, ContentType='application/pdf')
    stored = StoredFile(storage_key=key, original_file_name='cancellation.pdf', content_type='application/pdf', size_bytes=len(policy))
    session.add(stored)
    session.flush()
    archive = ArchivedFile(file_id=stored.id, sha256=hashlib.sha256(policy).hexdigest(), archived_at=now)
    document = TournamentDocument(tournament_id=tournament.id, purpose='cancellation_policy', title='Cancellation policy')
    session.add_all([archive, document])
    session.flush()
    session.add(TournamentDocumentVersion(document_id=document.id, archive_id=archive.id))


def seed_tournaments(session: Session, accounts: dict) -> dict:
    now = datetime.now(UTC)
    today = now.astimezone(timezone(timedelta(hours=-3))).date()
    offerings = {}
    for slug, name in [
        ('registration', 'E2E Registration'), ('payment', 'E2E Payment'),
        ('waitlist', 'E2E Waitlist'), ('waitlist-refund', 'E2E Waitlist Refund'),
    ]:
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
        offerings[slug] = (tournament, option, price)
    _add_refundable_policy(session, offerings['waitlist-refund'][0], now)
    session.commit()

    event, option, price = offerings['payment']
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
    return {
        'registration_tournament_id': offerings['registration'][0].id,
        'payment_tournament_id': event.id,
        'payment_registration_number': registration.registration_number,
        'staff_id': accounts['staff']['id'],
        'waitlist_tournament_id': offerings['waitlist'][0].id,
        'waitlist_refund_tournament_id': offerings['waitlist-refund'][0].id,
    }
