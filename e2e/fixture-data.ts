import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type FixtureData = {
  registration_tournament_id: number
  payment_tournament_id: number
  payment_registration_number: string
  staff_id: string
}

export function fixtureData(): FixtureData {
  const path = process.env.E2E_FIXTURE_FILE || join(__dirname, '.explore-fixtures.json')
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureData
}

export const fixturePassword = 'E2e-fixture-password-2026!'
