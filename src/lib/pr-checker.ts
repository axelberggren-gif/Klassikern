import type { Session, SportType } from '@/types/database';

// ---------------------------------------------------------------------------
// Personal Record Types & Detection
// ---------------------------------------------------------------------------

export type PRCategory = 'fastest_pace' | 'longest_distance' | 'highest_ep';

export interface PersonalRecord {
  category: PRCategory;
  sportType: SportType;
  value: number;
  previousBest: number | null;
  label: string;
  formattedValue: string;
  formattedPrevious: string | null;
}

const DISTANCE_SPORTS: SportType[] = ['cycling', 'running', 'swimming'];

function formatPace(minPerUnit: number, sport: SportType): string {
  const mins = Math.floor(minPerUnit);
  const secs = Math.round((minPerUnit - mins) * 60);
  const unit = sport === 'swimming' ? '/100m' : '/km';
  return `${mins}:${secs.toString().padStart(2, '0')} ${unit}`;
}

function formatDistance(value: number, sport: SportType): string {
  if (sport === 'swimming') {
    return `${Math.round(value)} m`;
  }
  return `${value.toFixed(1)} km`;
}

/**
 * Calculate pace for a session.
 * Cycling/running: minutes per km (lower = faster)
 * Swimming: minutes per 100m (distance_km stores meters for swimming)
 */
function getPace(session: Session): number | null {
  if (!session.distance_km || session.distance_km <= 0) return null;
  if (session.sport_type === 'swimming') {
    // distance_km is actually meters for swimming
    return session.duration_minutes / (session.distance_km / 100);
  }
  return session.duration_minutes / session.distance_km;
}

/**
 * Detect personal records by comparing a new session against all previous sessions.
 * Returns an array of PRs that were broken.
 */
export function detectPersonalRecords(
  newSession: Session,
  previousSessions: Session[]
): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  const sport = newSession.sport_type;

  // Filter previous sessions of the same sport type
  const sameSport = previousSessions.filter(
    (s) => s.sport_type === sport && s.id !== newSession.id
  );

  // 1. Highest EP single session
  const prevBestEP = sameSport.length > 0
    ? Math.max(...sameSport.map((s) => s.ep_earned))
    : null;

  if (prevBestEP === null || newSession.ep_earned > prevBestEP) {
    prs.push({
      category: 'highest_ep',
      sportType: sport,
      value: newSession.ep_earned,
      previousBest: prevBestEP,
      label: 'Högsta EP',
      formattedValue: `${newSession.ep_earned} EP`,
      formattedPrevious: prevBestEP !== null ? `${prevBestEP} EP` : null,
    });
  }

  // Only check distance-based PRs for relevant sports
  if (!DISTANCE_SPORTS.includes(sport)) return prs;

  // 2. Longest distance
  if (newSession.distance_km && newSession.distance_km > 0) {
    const prevBestDist = sameSport
      .filter((s) => s.distance_km && s.distance_km > 0)
      .reduce((max, s) => Math.max(max, s.distance_km!), 0);

    const hasPrevious = prevBestDist > 0;

    if (!hasPrevious || newSession.distance_km > prevBestDist) {
      prs.push({
        category: 'longest_distance',
        sportType: sport,
        value: newSession.distance_km,
        previousBest: hasPrevious ? prevBestDist : null,
        label: 'Längsta distans',
        formattedValue: formatDistance(newSession.distance_km, sport),
        formattedPrevious: hasPrevious ? formatDistance(prevBestDist, sport) : null,
      });
    }
  }

  // 3. Fastest pace (only if distance is provided)
  const newPace = getPace(newSession);
  if (newPace !== null) {
    const prevPaces = sameSport
      .map((s) => getPace(s))
      .filter((p): p is number => p !== null);

    const prevBestPace = prevPaces.length > 0 ? Math.min(...prevPaces) : null;

    if (prevBestPace === null || newPace < prevBestPace) {
      prs.push({
        category: 'fastest_pace',
        sportType: sport,
        value: newPace,
        previousBest: prevBestPace,
        label: 'Snabbaste tempo',
        formattedValue: formatPace(newPace, sport),
        formattedPrevious: prevBestPace !== null ? formatPace(prevBestPace, sport) : null,
      });
    }
  }

  return prs;
}

// ---------------------------------------------------------------------------
// All-time bests for the progress page
// ---------------------------------------------------------------------------

export interface SportRecords {
  sportType: SportType;
  bestEP: { value: number; date: string } | null;
  longestDistance: { value: number; date: string; formatted: string } | null;
  fastestPace: { value: number; date: string; formatted: string } | null;
  longestDuration: { value: number; date: string } | null;
}

export function computeAllTimeRecords(sessions: Session[]): SportRecords[] {
  const sportTypes: SportType[] = ['cycling', 'running', 'swimming', 'hiit', 'other'];
  const records: SportRecords[] = [];

  for (const sport of sportTypes) {
    const sportSessions = sessions.filter((s) => s.sport_type === sport);
    if (sportSessions.length === 0) continue;

    // Best EP
    const bestEPSession = sportSessions.reduce((best, s) =>
      s.ep_earned > best.ep_earned ? s : best
    );

    // Longest duration
    const longestDurationSession = sportSessions.reduce((best, s) =>
      s.duration_minutes > best.duration_minutes ? s : best
    );

    // Longest distance (only for distance sports)
    let longestDistance: SportRecords['longestDistance'] = null;
    let fastestPace: SportRecords['fastestPace'] = null;

    if (DISTANCE_SPORTS.includes(sport)) {
      const withDistance = sportSessions.filter(
        (s) => s.distance_km && s.distance_km > 0
      );

      if (withDistance.length > 0) {
        const best = withDistance.reduce((b, s) =>
          s.distance_km! > b.distance_km! ? s : b
        );
        longestDistance = {
          value: best.distance_km!,
          date: best.date,
          formatted: formatDistance(best.distance_km!, sport),
        };

        // Fastest pace
        const withPace = withDistance
          .map((s) => ({ session: s, pace: getPace(s)! }))
          .filter((x) => x.pace > 0);

        if (withPace.length > 0) {
          const fastest = withPace.reduce((b, x) =>
            x.pace < b.pace ? x : b
          );
          fastestPace = {
            value: fastest.pace,
            date: fastest.session.date,
            formatted: formatPace(fastest.pace, sport),
          };
        }
      }
    }

    records.push({
      sportType: sport,
      bestEP: { value: bestEPSession.ep_earned, date: bestEPSession.date },
      longestDistance,
      fastestPace,
      longestDuration: {
        value: longestDurationSession.duration_minutes,
        date: longestDurationSession.date,
      },
    });
  }

  return records;
}
