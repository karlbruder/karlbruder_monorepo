import { describe, expect, it, vi } from 'vitest'
import { createRegistration, listOwnRegistrations, requestParentalConsentFormUploadUrl, uploadFileToPresignedUrl, type RegistrationCreate } from '@/features/tournament/api/tournaments'

const payload: RegistrationCreate = {
  full_name: 'Fixture Athlete',
  social_name: null,
  birth_date: '2000-01-01',
  identity_document_type: 'passport',
  identity_document_number: 'AB-123',
  email: 'athlete@example.test',
  phone: '+55 11 0000-0000',
  city: 'Fixture City',
  state_or_province: null,
  country: 'Fixture Country',
  school_or_team_name: null,
  instructor_name: null,
  hema_experience_description: '2 years',
  hema_started_year: null,
  previous_tournament_count: 0,
  hema_ratings_reference: null,
  handedness: null,
  category_or_eligibility_note: null,
  emergency_contact_name: 'Fixture Contact',
  emergency_contact_phone: '+55 11 0000-0001',
  declares_truthful_information: true,
  declares_has_required_equipment: true,
  declares_physically_fit: true,
  accepts_rules: true,
  accepts_data_processing: true,
  acknowledges_inherent_risks: true,
  accepts_cancellation_policy: true,
  authorizes_image_use: false,
}

describe('tournament registration API', () => {
  it('createRegistration sends JSON with the bearer token', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        registration_number: 'T1-000001-1',
        registration_status: 'awaiting_payment',
        full_name: payload.full_name,
        email: payload.email,
        tournament_id: 1,
      }),
    })
    vi.stubGlobal('fetch', request)
    vi.stubEnv('VITE_API_BASE_URL', '/api')

    await createRegistration(1, 'test-token', payload)

    const [url, options] = request.mock.calls[0]
    expect(url).toBe('/api/tournaments/1/registrations')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(options.body as string)).toEqual(payload)
  })

  it('requestParentalConsentFormUploadUrl posts with the bearer token only', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        storage_key: 'tournaments/1/staging/user/parental_consent_form/uuid',
        upload_url: 'https://example.test/upload',
        expires_in_seconds: 900,
        required_headers: { 'Content-Type': 'application/pdf' },
      }),
    })
    vi.stubGlobal('fetch', request)
    vi.stubEnv('VITE_API_BASE_URL', '/api')

    const upload = await requestParentalConsentFormUploadUrl(42, 'test-token')

    const [url, options] = request.mock.calls[0]
    expect(url).toBe('/api/tournaments/42/registrations/parental-consent-form/upload-url')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ Authorization: 'Bearer test-token' })
    expect(upload.storage_key).toContain('parental_consent_form')
  })

  it('uploadFileToPresignedUrl sends a PUT with required headers and the file body', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'term.pdf', { type: 'application/pdf' })
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', request)

    await uploadFileToPresignedUrl('https://example.test/upload', file, { 'Content-Type': 'application/pdf' })

    const [url, options] = request.mock.calls[0]
    expect(url).toBe('https://example.test/upload')
    expect(options.method).toBe('PUT')
    expect(options.body).toBe(file)
    expect(options.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('listOwnRegistrations keeps an account id on a staff row and rejects a non-string account id', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api')
    const staffRow = {
      registration_number: 'T42-000001-5',
      registration_status: 'awaiting_payment',
      full_name: 'Fixture Athlete',
      email: 'athlete@example.test',
      tournament_id: 42,
      user_id: 'athlete-uuid',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [staffRow],
    }))

    await expect(listOwnRegistrations(42, 'test-token')).resolves.toEqual([staffRow])

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ ...staffRow, user_id: 42 }],
    }))
    await expect(listOwnRegistrations(42, 'test-token')).rejects.toThrow('invalid-registration-list')
  })
})
