import type { StravaConnection, SportType, EffortRating } from '@/types/database';

// ---------------------------------------------------------------------------
// Strava API types
// ---------------------------------------------------------------------------

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh an expired Strava access token.
 * Returns the new token data or null on failure.
 */
export async function refreshStravaToken(
  connection: StravaConnection
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null> {
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) {
      console.error('Strava token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };
  } catch (error) {
    console.error('Error refreshing Strava token:', error);
    return null;
  }
}

/**
 * Check if a Strava token is expired (with 5-minute buffer).
 */
export function isTokenExpired(connection: StravaConnection): boolean {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const now = Date.now();
  // Add 5-minute buffer
  return now >= expiresAt - 5 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Fetch activities
// ---------------------------------------------------------------------------

/**
 * Fetch activities from Strava API.
 * @param accessToken - Valid Strava access token
 * @param after - Unix timestamp; only return activities after this date
 * @param page - Page number for pagination (default 1)
 * @param perPage - Number of activities per page (default 30, max 200)
 */
export async function getStravaActivities(
  accessToken: string,
  after?: number,
  page = 1,
  perPage = 30
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (after) {
    params.set('after', String(after));
  }

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Strava activities fetch failed:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    return [];
  }
}

/**
 * Fetch a single activity by ID from Strava API.
 */
export async function getStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity | null> {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Strava activity fetch failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Strava activity:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Activity type mapping
// ---------------------------------------------------------------------------

/**
 * Map a Strava activity type to the app's SportType.
 * Strava uses both `type` and `sport_type` fields.
 */
export function mapStravaToSportType(stravaType: string): SportType {
  const normalized = stravaType.toLowerCase();

  // Cycling variants
  if (
    normalized === 'ride' ||
    normalized === 'virtualride' ||
    normalized === 'ebikeride' ||
    normalized === 'gravel_cycling' ||
    normalized === 'mountain_bike_ride' ||
    normalized === 'velomobile'
  ) {
    return 'cycling';
  }

  // Running variants
  if (
    normalized === 'run' ||
    normalized === 'virtualrun' ||
    normalized === 'trail_run' ||
    normalized === 'trailrun'
  ) {
    return 'running';
  }

  // Swimming variants
  if (normalized === 'swim' || normalized === 'open_water_swimming') {
    return 'swimming';
  }

  // HIIT / strength variants
  if (
    normalized === 'crossfit' ||
    normalized === 'weighttraining' ||
    normalized === 'weight_training' ||
    normalized === 'hiit'
  ) {
    return 'hiit';
  }

  // Everything else
  return 'other';
}

// ---------------------------------------------------------------------------
// Map Strava activity to session data
// ---------------------------------------------------------------------------

export interface MappedSession {
  sport_type: SportType;
  date: string;
  duration_minutes: number;
  distance_km: number | null;
  effort_rating: EffortRating;
  note: string;
  strava_activity_id: number;
}

/**
 * Map a Strava activity to session insert data.
 * Defaults effort_rating to 3 since Strava doesn't have our rating system.
 */
export function mapStravaToSession(activity: StravaActivity): MappedSession {
  const sportType = mapStravaToSportType(activity.type);
  const durationMinutes = Math.round(activity.moving_time / 60);
  const distanceKm =
    activity.distance > 0
      ? Math.round((activity.distance / 1000) * 100) / 100
      : null;

  // Extract date in YYYY-MM-DD format from local time
  const date = activity.start_date_local
    ? activity.start_date_local.split('T')[0]
    : new Date(activity.start_date).toISOString().split('T')[0];

  return {
    sport_type: sportType,
    date,
    duration_minutes: durationMinutes,
    distance_km: distanceKm,
    effort_rating: 3 as EffortRating,
    note: `Strava: ${activity.name}`,
    strava_activity_id: activity.id,
  };
}
