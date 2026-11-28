"""Seed confirmed paid registrations for cancellation and refund journeys."""

import hashlib
import logging
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import boto3
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.files.models import ArchivedFile, StoredFile
from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentDocument, TournamentDocumentVersion, TournamentPaymentSettings, TournamentProduct, TournamentRegistrationDocument
from app.tournaments.schemas import PaymentReviewDecisionCreate, RegistrationCreate
from app.tournaments.services.payment_proof_reviews import record_payment_review_decision
from app.tournaments.services.registration_acceptances import build_registration_acceptance_content, calculate_registration_acceptance_digest, current_policy_versions
from app.tournaments.services.tournament_registrations import create_tournament_registration
from config import settings


PROOF = b'%PDF-1.4\n% cancellation refund synthetic proof\n%%EOF\n'


def seed_cancellation_refunds(session: Session, accounts: dict) -> dict:
    now = datetime.now(UTC)
    today = now.astimezone(timezone(timedelta(hours=-3))).date()
    s3 = boto3.client('s3', endpoint_url=settings.S3_ENDPOINT_URL, region_name='us-east-2')
    admin = User(id=accounts['cancellation-admin']['id'], email=accounts['cancellation-admin']['email'], app_metadata={'karlbruder_role': 'admin'})
    fixtures = {}
    for scenario, account in [('owner', 'cancellation-owner'), ('staffCancellation', 'cancellation-staff-owner')]:
        tournament = Tournament(name=f'E2E Cancellation {scenario}', slug=f'e2e-cancellation-{account}', starts_at=now + timedelta(days=30), registration_opens_on=today - timedelta(days=1), registration_closes_on=today + timedelta(days=10), competitor_capacity=1, location='Fixture venue', refunds_allowed=True)
        product = Product(name='E2E entry', description='Synthetic tournament entry')
        session.add_all([tournament, product])
        session.flush()
        option = TournamentProduct(tournament_id=tournament.id, product_id=product.id)
        price = Price(product_id=product.id, amount=Decimal('100.00'))
        session.add_all([option, price, TournamentPaymentSettings(tournament_id=tournament.id, pix_key='fixture@example.test')])
        policy = b'%PDF-1.4\n% cancellation refund policy\n%%EOF\n'
        policy_key = f'fixtures/cancellation-{account}-policy.pdf'
        s3.put_object(Bucket=settings.S3_BUCKET_NAME, Key=policy_key, Body=policy, ContentType='application/pdf')
        policy_file = StoredFile(storage_key=policy_key, original_file_name='cancellation.pdf', content_type='application/pdf', size_bytes=len(policy))
        session.add(policy_file)
        session.flush()
        archive = ArchivedFile(file_id=policy_file.id, sha256=hashlib.sha256(policy).hexdigest(), archived_at=now)
        document = TournamentDocument(tournament_id=tournament.id, purpose='cancellation_policy', title='Cancellation policy')
        session.add_all([archive, document])
        session.flush()
        session.add(TournamentDocumentVersion(document_id=document.id, archive_id=archive.id))
        session.commit()
        owner = User(id=accounts[account]['id'], email=accounts[account]['email'], app_metadata={'karlbruder_role': 'regular_user'})
        payload = RegistrationCreate(tournament_product_id=option.id, price_id=price.id, acceptance_language='pt', acceptance_token=calculate_registration_acceptance_digest(build_registration_acceptance_content(tournament, 'pt', current_policy_versions(session, [tournament.id])[tournament.id])), full_name=f'Fixture {account}', birth_date='2000-01-01', identity_document_type='passport', identity_document_number=f'E2E-{account}', email=owner.email, phone='+55 11 0000-0000', city='Fixture City', country='Brazil', hema_experience_description='3 years', previous_tournament_count=0, emergency_contact_name='Fixture Contact', emergency_contact_phone='+55 11 0000-0001', declares_truthful_information=True, declares_has_required_equipment=True, declares_physically_fit=True, accepts_rules=True, accepts_data_processing=True, acknowledges_inherent_risks=True, accepts_cancellation_policy=True)
        registration = create_tournament_registration(session, tournament.id, owner, payload, '127.0.0.1')
        key = f'fixtures/cancellation-{account}-proof.pdf'
        s3.put_object(Bucket=settings.S3_BUCKET_NAME, Key=key, Body=PROOF, ContentType='application/pdf')
        proof = TournamentRegistrationDocument(registration_id=registration.id, document_type='payment_proof', file=StoredFile(storage_key=key, original_file_name='cancellation-proof.pdf', content_type='application/pdf', size_bytes=len(PROOF)))
        session.add(proof)
        registration.registration_status = 'awaiting_payment_confirmation'
        session.commit()
        # The unavailable-mail log otherwise contaminates the JSON fixture output.
        logger = logging.getLogger('app.tournaments.services.payment_review_notifications')
        was_disabled = logger.disabled
        logger.disabled = True
        try:
            decision = record_payment_review_decision(session, admin, registration.registration_number, PaymentReviewDecisionCreate(document_id=proof.id, decision='approved', amount_received=Decimal('123.45'), requirements_checked=True), accounts=None, sender=None, application_base_url=None, from_address='')
        finally:
            logger.disabled = was_disabled
        assert decision.registration_status == 'confirmed'
        fixtures[scenario] = {'tournamentId': tournament.id, 'registrationNumber': registration.registration_number}
    return fixtures
