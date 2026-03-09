import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

/**
 * GET /api/strava/authorize
 *
 * Redirects the authenticated user to Strava's OAuth authorization page.
 * Stores a CSRF state token in a cookie for validation in the callback.
 * Builds the redirect URI dynamically from the request origin so it works
 * on any deployment (local, preview, production).
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  // Verify user is authenticated
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;

  if (!clientId) {
    console.error('Missing STRAVA_CLIENT_ID env var');
    return NextResponse.redirect(new URL('/profile?strava=error', origin));
  }

  // Generate a CSRF state token
  const state = crypto.randomUUID();

  // Store state in a cookie for validation in the callback
  const cookieStore = await cookies();
  cookieStore.set('strava_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Build Strava OAuth URL with dynamic redirect URI
  const redirectUri = `${origin}/api/strava/callback`;
  const stravaAuthUrl = new URL('https://www.strava.com/oauth/authorize');
  stravaAuthUrl.searchParams.set('client_id', clientId);
  stravaAuthUrl.searchParams.set('redirect_uri', redirectUri);
  stravaAuthUrl.searchParams.set('response_type', 'code');
  stravaAuthUrl.searchParams.set('approval_prompt', 'auto');
  stravaAuthUrl.searchParams.set('scope', 'activity:read_all');
  stravaAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(stravaAuthUrl.toString());
}
