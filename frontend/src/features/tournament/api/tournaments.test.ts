import { describe, expect, it, vi } from 'vitest'
import { createSignup, requestParentalTermUploadUrl, type SignupCreate } from '@/features/tournament/api/tournaments'

const payload: SignupCreate = {
  full_name: 'Fixture Athlete',
  social_name: null,
  birth_date: '2000-01-01',
  document_type: 'passport',
  document_id: 'AB-123',
  email: 'athlete@example.test',
  phone: '+55 11 0000-0000',
  city: 'Fixture City',
  state: null,
  country: 'Fixture Country',
  school_name: null,
  responsible_instructor_name: null,
  hema_practice_duration: '2 years',
  hema_practice_start_year: null,
  prior_tournaments_count: 0,
  hema_ratings_ref: null,
  handedness: null,
  special_category_note: null,
  emergency_contact_name: 'Fixture Contact',
  emergency_contact_phone: '+55 11 0000-0001',
  declares_truthful_information: true,
  declares_required_equipment: true,
  declares_physically_fit: true,
  accepts_regulation: true,
  accepts_data_processing: true,
  acknowledges_inherent_risks: true,
  accepts_cancellation_policy: true,
  image_use_authorized: false,
}

describe('tournament signup API', () => {
  it('createSignup sends JSON with the bearer token', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        inscription_number: 'T1-000001-1',
        status: 'awaiting_payment',
        full_name: payload.full_name,
        email: payload.email,
        tournament_id: 1,
      }),
    })
    vi.stubGlobal('fetch', request)
    vi.stubEnv('VITE_API_BASE_URL', '/api')

    await createSignup(1, 'test-token', payload)

    const [url, options] = request.mock.calls[0]
    expect(url).toBe('/api/tournaments/1/signups')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(options.body as string)).toEqual(payload)
  })

  it('requestParentalTermUploadUrl posts with the bearer token only', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        storage_key: 'tournaments/1/staging/user/parental_term/uuid',
        upload_url: 'https://example.test/upload',
        expires_in_seconds: 900,
        required_headers: { 'Content-Type': 'application/pdf' },
      }),
    })
    vi.stubGlobal('fetch', request)
    vi.stubEnv('VITE_API_BASE_URL', '/api')

    const upload = await requestParentalTermUploadUrl(42, 'test-token')

    const [url, options] = request.mock.calls[0]
    expect(url).toBe('/api/tournaments/42/signups/parental-term/upload-url')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ Authorization: 'Bearer test-token' })
    expect(upload.storage_key).toContain('parental_term')
  })
})
