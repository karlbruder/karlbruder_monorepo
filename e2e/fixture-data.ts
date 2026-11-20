import { readFileSync } from 'node:fs'

type FixtureData = {
  registration_tournament_id: number
  payment_tournament_id: number
  payment_registration_number: string
  staff_id: string
}

export function fixtureData(): FixtureData {
  const path = process.env.E2E_FIXTURE_FILE
  if (!path) throw new Error('E2E_FIXTURE_FILE is required. Start the stack with scripts/e2e/run.sh.')
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureData
}

export const fixturePassword = 'E2e-fixture-password-2026!'
