import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  refreshStravaToken,
  isTokenExpired,
  getStravaActivity,
  mapStravaToSession,
} from '@/lib/strava';
import { calculateEP } from '@/lib/ep-calculator';
import type { Database, StravaConnection } from '@/types/database';

/**
 * Create a Supabase admin client for webhook processing.
 * Webhooks don't have user cookies, so we use the service role key.
 * Falls back to anon key if service role is not configured.
 */
function createWebhookSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for webhook context
      },
    },
  });
}

// ---------------------------------------------------------------------------
// GET: Webhook verification (Strava subscription validation)
// ---------------------------------------------------------------------------

/**
 * GET /api/strava/webhook
 *
 * Strava sends a GET request to verify the webhook endpoint during
 * subscription creation. We must respond with the hub.challenge value.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Validate the verification request
  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST: Incoming webhook events
// ---------------------------------------------------------------------------

interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number; // Strava athlete ID
  subscription_id: number;
  event_time: number;
  updates?: Record<string, unknown>;
}

/**
 * POST /api/strava/webhook
 *
 * Handles incoming webhook events from Strava.
 * - On activity create: fetches the activity and imports it as a session
 * - On activity delete: does not delete the local session (user might want to keep it)
 * - On activity update: not handled (user can re-sync manually)
 */
export async function POST(request: NextRequest) {
  let event: StravaWebhookEvent;

  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only process new activities
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
    // Acknowledge the event but don't process it
    return NextResponse.json({ status: 'ok' });
  }

  const supabase = createWebhookSupabaseClient();

  // Find the user by Strava athlete ID
  const { data: connection, error: connError } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('strava_athlete_id', event.owner_id)
    .single();

  if (connError || !connection) {
    // No matching connection — athlete might have disconnected
    console.warn(
      `Strava webhook: no connection found for athlete ${event.owner_id}`
    );
    return NextResponse.json({ status: 'ok' });
  }

  // Check if this activity was already imported
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('strava_activity_id', event.object_id)
    .maybeSingle();

  if (existingSession) {
    // Already imported, skip
    return NextResponse.json({ status: 'ok', message: 'already_imported' });
  }

  let accessToken = connection.access_token;

  // Refresh token if expired
  if (isTokenExpired(connection as StravaConnection)) {
    const refreshed = await refreshStravaToken(connection as StravaConnection);
    if (!refreshed) {
      console.error(
        `Strava webhook: failed to refresh token for user ${connection.user_id}`
      );
      return NextResponse.json({ status: 'ok', message: 'token_refresh_failed' });
    }

    await supabase
      .from('strava_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      })
      .eq('user_id', connection.user_id);

    accessToken = refreshed.access_token;
  }

  // Fetch the activity from Strava
  const activity = await getStravaActivity(accessToken, event.object_id);
  if (!activity) {
    console.error(
      `Strava webhook: failed to fetch activity ${event.object_id}`
    );
    return NextResponse.json({ status: 'ok', message: 'fetch_failed' });
  }

  // Get the user's profile for EP calculation
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', connection.user_id)
    .single();

  if (!profile) {
    console.error(
      `Strava webhook: profile not found for user ${connection.user_id}`
    );
    return NextResponse.json({ status: 'ok', message: 'profile_not_found' });
  }

  // Map and import the activity
  const mapped = mapStravaToSession(activity);
  const ep = calculateEP(
    mapped.sport_type,
    mapped.duration_minutes,
    mapped.effort_rating,
    profile.current_streak
  );

  const { error: insertError } = await supabase.from('sessions').insert({
    user_id: connection.user_id,
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
    console.error('Strava webhook: error inserting session:', insertError);
    return NextResponse.json({ status: 'ok', message: 'insert_failed' });
  }

  // Update profile EP
  await supabase
    .from('profiles')
    .update({
      total_ep: profile.total_ep + ep,
    })
    .eq('id', connection.user_id);

  // Add to activity feed if user has a group
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', connection.user_id)
    .limit(1)
    .maybeSingle();

  if (membership?.group_id) {
    await supabase.from('activity_feed').insert({
      group_id: membership.group_id,
      user_id: connection.user_id,
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

  return NextResponse.json({
    status: 'ok',
    message: 'imported',
    ep_earned: ep,
  });
}
