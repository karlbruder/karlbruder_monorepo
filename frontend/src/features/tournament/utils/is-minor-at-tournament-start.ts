const TOURNAMENT_LOCAL_OFFSET_MINUTES = -3 * 60;

function parseIsoDateOnly(isoDate: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || !Number.isSafeInteger(day)) {
    return null;
  }
  return { year, month, day };
}

function calendarDateFromUtcInstant(isoInstant: string): { year: number; month: number; day: number } | null {
  const parsed = Date.parse(isoInstant);
  if (Number.isNaN(parsed)) return null;
  const localMillis = parsed + TOURNAMENT_LOCAL_OFFSET_MINUTES * 60 * 1000;
  const local = new Date(localMillis);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
  };
}

function compareCalendarDates(
  left: { year: number; month: number; day: number },
  right: { year: number; month: number; day: number },
): number {
  if (left.year !== right.year) return left.year < right.year ? -1 : 1;
  if (left.month !== right.month) return left.month < right.month ? -1 : 1;
  if (left.day !== right.day) return left.day < right.day ? -1 : 1;
  return 0;
}

export function eighteenthBirthday(birthDateIso: string): { year: number; month: number; day: number } | null {
  const birth = parseIsoDateOnly(birthDateIso);
  if (!birth) return null;
  const targetYear = birth.year + 18;
  const feb29 = birth.month === 2 && birth.day === 29;
  if (feb29) {
    return { year: targetYear, month: 3, day: 1 };
  }
  return { year: targetYear, month: birth.month, day: birth.day };
}

/** Display-only hint for the parental consent form field. The backend decides eligibility. */
export function isMinorAtTournamentStart(birthDateIso: string, tournamentStartsAtIso: string): boolean {
  const birth = parseIsoDateOnly(birthDateIso);
  const eventDay = calendarDateFromUtcInstant(tournamentStartsAtIso);
  const eighteenth = eighteenthBirthday(birthDateIso);
  if (!birth || !eventDay || !eighteenth) return false;
  return compareCalendarDates(eventDay, eighteenth) < 0;
}
