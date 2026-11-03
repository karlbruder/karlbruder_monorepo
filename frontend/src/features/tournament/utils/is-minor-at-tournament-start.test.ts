import { describe, expect, it } from 'vitest'
import { eighteenthBirthday, isMinorAtTournamentStart } from '@/features/tournament/utils/is-minor-at-tournament-start'

describe('isMinorAtTournamentStart mirrors backend UTC-3 event-day rules', () => {
  it('maps a leap-day birth date to 1 March for the eighteenth birthday', () => {
    expect(eighteenthBirthday('2008-02-29')).toEqual({ year: 2026, month: 3, day: 1 })
  })

  it.each([
    ['2009-01-17', '2027-01-17T12:00:00.000Z', false],
    ['2009-01-17', '2027-01-16T12:00:00.000Z', true],
    ['2009-01-17', '2027-01-18T12:00:00.000Z', false],
  ])('birth %s at start %s → minor=%s', (birthDate, startsAt, expectedMinor) => {
    expect(isMinorAtTournamentStart(birthDate, startsAt)).toBe(expectedMinor)
  })

  it('uses the local event day when the UTC instant is still the previous calendar day in UTC-3', () => {
    expect(isMinorAtTournamentStart('2009-01-17', '2027-01-17T02:59:00.000Z')).toBe(true)
  })
})
