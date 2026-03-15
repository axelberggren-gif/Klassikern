import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { hasPrivateActivityScope, type StravaTokenResponse } from '@/lib/strava';

/**
 * GET /api/strava/callback
 *
 * Handles the OAuth callback from Strava after the user authorizes the app.
 * Exchanges the authorization code for access + refresh tokens and stores
 * the connection in the strava_connections table.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = new URL(request.url).origin;

  // Handle user denying access
  if (error) {
    console.error('Strava OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/profile?strava=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/profile?strava=error`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get('strava_oauth_state')?.value;

  if (!savedState || savedState !== state) {
    console.error('Strava OAuth state mismatch');
    return NextResponse.redirect(`${baseUrl}/profile?strava=error`);
  }

  // Clear the state cookie
  cookieStore.delete('strava_oauth_state');

  // Verify user is authenticated
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  // Exchange authorization code for tokens
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
    return NextResponse.redirect(`${baseUrl}/profile?strava=error`);
  }

  try {
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Strava token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.redirect(`${baseUrl}/profile?strava=error`);
    }

    const tokenData: StravaTokenResponse = await tokenResponse.json();

    // Store/update the connection in the database
    // Use upsert since the user_id column has a unique constraint
    // Store the ACTUAL granted scope — Strava lets users uncheck
    // "View data about your private activities" which downgrades
    // the scope from activity:read_all to activity:read.
    const grantedScope = tokenData.scope || 'activity:read';
    const { error: upsertError } = await supabase
      .from('strava_connections')
      .upsert(
        {
          user_id: user.id,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
          scope: grantedScope,
          athlete_name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('Error storing Strava connection:', upsertError);
      return NextResponse.redirect(`${baseUrl}/profile?strava=error`);
    }

    // Warn user if they didn't grant private activity access
    const stravaParam = hasPrivateActivityScope(grantedScope)
      ? 'connected'
      : 'connected_limited';
    return NextResponse.redirect(`${baseUrl}/profile?strava=${stravaParam}`);
  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(`${baseUrl}/profile?strava=error`);
  }
}
