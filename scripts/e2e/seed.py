"""Seed disposable Auth accounts and tournament data for browser tests."""
import hashlib
import json
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import boto3
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.main  # noqa: F401  # Register all mapped models.
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

PASSWORD = 'E2e-fixture-password-2026!'
accounts = {}
with httpx.Client(base_url=settings.issuer, timeout=10, trust_env=True) as auth:
    for name, role in [('participant', 'regular_user'), ('owner', 'regular_user'), ('waitlist-a', 'regular_user'), ('waitlist-b', 'regular_user'), ('waitlist-c', 'regular_user'), ('refund-a', 'regular_user'), ('refund-b', 'regular_user'), ('staff', 'admin')]:
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
    for slug, name in [('registration', 'E2E Registration'), ('payment', 'E2E Payment'), ('waitlist', 'E2E Waitlist'), ('waitlist-refund', 'E2E Waitlist Refund')]:
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
    refundable = offerings[3][0]
    refundable.refunds_allowed = True
    policy = b"%PDF-1.4\n% synthetic cancellation policy\n%%EOF\n"
    key = 'fixtures/waitlist-cancellation-policy.pdf'
    s3 = boto3.client('s3', endpoint_url=settings.S3_ENDPOINT_URL, region_name='us-east-2')
    s3.put_object(Bucket=settings.S3_BUCKET_NAME, Key=key, Body=policy, ContentType='application/pdf')
    stored = StoredFile(storage_key=key, original_file_name='cancellation.pdf', content_type='application/pdf', size_bytes=len(policy))
    session.add(stored)
    session.flush()
    archive = ArchivedFile(file_id=stored.id, sha256=hashlib.sha256(policy).hexdigest(), archived_at=now)
    document = TournamentDocument(tournament_id=refundable.id, purpose='cancellation_policy', title='Cancellation policy')
    session.add_all([archive, document])
    session.flush()
    session.add(TournamentDocumentVersion(document_id=document.id, archive_id=archive.id))
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
        'payment_registration_number': registration.registration_number, 'staff_id': accounts['staff']['id'],
        'waitlist_tournament_id': offerings[2][0].id, 'waitlist_refund_tournament_id': offerings[3][0].id}))
