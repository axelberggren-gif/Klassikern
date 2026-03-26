import type { Profile, Session, SportType } from '@/types/database';
import { MS_PER_DAY, PROGRAM_START_DATE } from '@/lib/date-utils';
import { TRAINING_PLAN } from '@/lib/training-plan';

type RaceDateField =
  | 'race_date_vattern'
  | 'race_date_vansbro'
  | 'race_date_lidingo'
  | 'race_date_vasaloppet';

export type ReadinessStatus = 'on_track' | 'behind' | 'significantly_behind';

export interface RaceCountdownCard {
  key: string;
  name: string;
  date: string;
  daysRemaining: number;
  readinessStatus: ReadinessStatus;
  readinessPercent: number;
  planCompletionPercent: number;
  sport: SportType;
}

interface RaceDefinition {
  key: string;
  name: string;
  sport: SportType;
  dateField: RaceDateField;
  defaultDate: string;
}

const RACE_DEFINITIONS: RaceDefinition[] = [
  {
    key: 'vattern',
    name: 'Vätternrundan',
    sport: 'cycling',
    dateField: 'race_date_vattern',
    defaultDate: '2026-06-13',
  },
  {
    key: 'vansbro',
    name: 'Vansbrosimningen',
    sport: 'swimming',
    dateField: 'race_date_vansbro',
    defaultDate: '2026-07-04',
  },
  {
    key: 'lidingo',
    name: 'Lidingoloppet',
    sport: 'running',
    dateField: 'race_date_lidingo',
    defaultDate: '2026-09-26',
  },
  {
    key: 'vasaloppet',
    name: 'Vasaloppet',
    sport: 'hiit',
    dateField: 'race_date_vasaloppet',
    defaultDate: '2027-03-07',
  },
];

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function parseRaceDate(dateValue: string, fallbackValue: string): Date {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return normalizeDate(parsed);
  }
  return normalizeDate(new Date(`${fallbackValue}T00:00:00`));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getDaysRemaining(raceDate: Date, today: Date = new Date()): number {
  const todayStart = normalizeDate(today);
  const raceStart = normalizeDate(raceDate);
  return Math.ceil((raceStart.getTime() - todayStart.getTime()) / MS_PER_DAY);
}

export function getReadinessStatus(readinessRatio: number): ReadinessStatus {
  if (readinessRatio >= 1) return 'on_track';
  if (readinessRatio >= 0.7) return 'behind';
  return 'significantly_behind';
}

function getTrainingMinutesForSportUntilDate(
  sport: SportType,
  maxDateIso: string
): number {
  // HIIT is used as a practical proxy for Vasaloppet readiness in this MVP.
  return TRAINING_PLAN.reduce((sum, planned) => {
    if (planned.sport_type !== sport) return sum;
    if (!planned.suggested_duration_minutes) return sum;
    if (planned.date > maxDateIso) return sum;
    return sum + planned.suggested_duration_minutes;
  }, 0);
}

function getLoggedMinutesForSportUntilDate(
  sessions: Session[],
  sport: SportType,
  maxDateIso: string
): number {
  const programStartIso = PROGRAM_START_DATE.toISOString().split('T')[0];
  return sessions.reduce((sum, session) => {
    if (session.sport_type !== sport) return sum;
    if (session.date < programStartIso || session.date > maxDateIso) return sum;
    return sum + session.duration_minutes;
  }, 0);
}

export function buildRaceCountdownCards(
  profile: Profile,
  sessions: Session[],
  today: Date = new Date()
): RaceCountdownCard[] {
  const todayDate = normalizeDate(today);

  return RACE_DEFINITIONS.map((race) => {
    const raceDateValue = profile[race.dateField];
    const raceDate = parseRaceDate(raceDateValue, race.defaultDate);
    const raceDateIso = raceDate.toISOString().split('T')[0];
    const cappedTodayIso = (todayDate <= raceDate ? todayDate : raceDate)
      .toISOString()
      .split('T')[0];

    const totalPlannedMinutes = getTrainingMinutesForSportUntilDate(race.sport, raceDateIso);
    const elapsedPlannedMinutes = getTrainingMinutesForSportUntilDate(race.sport, cappedTodayIso);
    const loggedMinutes = getLoggedMinutesForSportUntilDate(sessions, race.sport, cappedTodayIso);

    const readinessRatio =
      elapsedPlannedMinutes > 0 ? loggedMinutes / elapsedPlannedMinutes : 0;
    const planCompletionRatio =
      totalPlannedMinutes > 0 ? loggedMinutes / totalPlannedMinutes : 0;

    return {
      key: race.key,
      name: race.name,
      date: raceDateIso,
      daysRemaining: getDaysRemaining(raceDate, todayDate),
      readinessStatus: getReadinessStatus(readinessRatio),
      readinessPercent: Math.round(clamp(readinessRatio * 100, 0, 150)),
      planCompletionPercent: Math.round(clamp(planCompletionRatio * 100, 0, 100)),
      sport: race.sport,
    };
  });
}
