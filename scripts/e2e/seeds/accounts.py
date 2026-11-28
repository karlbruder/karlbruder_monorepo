"""Create participant and staff accounts for registration, payment, and waitlist journeys."""

import httpx

from config import settings

PASSWORD = 'E2e-fixture-password-2026!'


def seed_accounts() -> dict:
    accounts = {}
    with httpx.Client(base_url=settings.issuer, timeout=10, trust_env=True) as auth:
        for name, role in [
            ('authorization-owner', 'regular_user'), ('authorization-other', 'regular_user'),
            ('authorization-member', 'guild_member'), ('authorization-admin', 'admin'),
            ('participant', 'regular_user'), ('owner', 'regular_user'),
            ('waitlist-a', 'regular_user'), ('waitlist-b', 'regular_user'),
            ('waitlist-c', 'regular_user'), ('refund-a', 'regular_user'),
            ('refund-b', 'regular_user'), ('staff', 'admin'),
            ('offering-staff', 'admin'), ('offering-a', 'regular_user'),
            ('offering-b', 'regular_user'), ('offering-c', 'regular_user'),
            ('offering-d', 'regular_user'), ('offering-e', 'regular_user'),
        ]:
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
    return accounts
