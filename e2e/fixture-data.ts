import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type CancellationRegistration = { tournamentId: number; registrationNumber: string }

type FixtureData = {
  registration_tournament_id: number
  payment_tournament_id: number
  payment_registration_number: string
  waitlist_tournament_id: number
  waitlist_refund_tournament_id: number
  staff_id: string
  cancellationRefunds: { owner: CancellationRegistration; staffCancellation: CancellationRegistration }
}

export function fixtureData(): FixtureData {
  const path = process.env.E2E_FIXTURE_FILE || join(__dirname, '.explore-fixtures.json')
  let content: string
  try {
    content = readFileSync(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`E2E fixture file not found at ${path}. Check E2E_FIXTURE_FILE or start an exploration stack with E2E_MODE=explore make test-e2e.`, { cause: error })
    }
    throw error
  }
  return JSON.parse(content) as FixtureData
}

export const fixturePassword = 'E2e-fixture-password-2026!'
