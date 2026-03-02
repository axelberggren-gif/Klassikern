import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  refreshStravaToken,
  isTokenExpired,
  getStravaActivities,
  mapStravaToSession,
} from '@/lib/strava';
import { calculateEP } from '@/lib/ep-calculator';
import type { StravaConnection } from '@/types/database';

/**
 * POST /api/strava/sync
 *
 * Manually syncs recent Strava activities for the authenticated user.
 * - Refreshes token if expired
 * - Fetches recent activities from Strava
 * - Imports new sessions (skips duplicates via strava_activity_id)
 * - Calculates EP for each imported session
 * - Updates profile EP total
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });
  }

  // Get the user's Strava connection
  const { data: connection, error: connError } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json(
      { error: 'Ingen Strava-koppling hittades' },
      { status: 404 }
    );
  }

  let accessToken = connection.access_token;

  // Refresh token if expired
  if (isTokenExpired(connection as StravaConnection)) {
    const refreshed = await refreshStravaToken(connection as StravaConnection);
    if (!refreshed) {
      return NextResponse.json(
        { error: 'Kunde inte uppdatera Strava-token. Prova att koppla om.' },
        { status: 401 }
      );
    }

    // Update tokens in database
    await supabase
      .from('strava_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      })
      .eq('user_id', user.id);

    accessToken = refreshed.access_token;
  }

  // Get the user's profile for EP calculation
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: 'Profil saknas' },
      { status: 404 }
    );
  }

  // Fetch activities from the last 30 days
  const thirtyDaysAgo = Math.floor(
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  );
  const activities = await getStravaActivities(accessToken, thirtyDaysAgo);

  if (activities.length === 0) {
    return NextResponse.json({ imported: 0, message: 'Inga nya aktiviteter hittades' });
  }

  // Get existing Strava activity IDs to skip duplicates
  const stravaIds = activities.map((a) => a.id);
  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('strava_activity_id')
    .in('strava_activity_id', stravaIds);

  const existingStravaIds = new Set(
    (existingSessions ?? []).map((s) => s.strava_activity_id)
  );

  // Filter to only new activities
  const newActivities = activities.filter(
    (a) => !existingStravaIds.has(a.id)
  );

  if (newActivities.length === 0) {
    return NextResponse.json({ imported: 0, message: 'Alla aktiviteter redan importerade' });
  }

  // Import new activities
  let importedCount = 0;
  let totalNewEP = 0;

  // Get user's group for activity feed
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const groupId = membership?.group_id ?? null;

  for (const activity of newActivities) {
    const mapped = mapStravaToSession(activity);
    const ep = calculateEP(
      mapped.sport_type,
      mapped.duration_minutes,
      mapped.effort_rating,
      profile.current_streak
    );

    const { error: insertError } = await supabase.from('sessions').insert({
      user_id: user.id,
      sport_type: mapped.sport_type,
      date: mapped.date,
      duration_minutes: mapped.duration_minutes,
      distance_km: mapped.distance_km,
      effort_rating: mapped.effort_rating,
      note: mapped.note,
      ep_earned: ep,
      is_bonus: true,
      strava_activity_id: mapped.strava_activity_id,
    });

    if (insertError) {
      // Skip this activity if insert fails (might be duplicate)
      console.error('Error inserting Strava session:', insertError);
      continue;
    }

    totalNewEP += ep;
    importedCount++;

    // Add to activity feed if user has a group
    if (groupId) {
      await supabase.from('activity_feed').insert({
        group_id: groupId,
        user_id: user.id,
        event_type: 'session_logged',
        event_data: {
          sport_type: mapped.sport_type,
          duration: mapped.duration_minutes,
          ep,
          note: mapped.note,
          source: 'strava',
        },
      });
    }
  }

  // Update profile EP total
  if (totalNewEP > 0) {
    await supabase
      .from('profiles')
      .update({
        total_ep: profile.total_ep + totalNewEP,
      })
      .eq('id', user.id);
  }

  return NextResponse.json({
    imported: importedCount,
    total_ep_earned: totalNewEP,
    message: `${importedCount} aktivitet${importedCount !== 1 ? 'er' : ''} importerade`,
  });
}
