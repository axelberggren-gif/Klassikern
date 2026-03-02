import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

/**
 * GET /api/strava/authorize
 *
 * Redirects the authenticated user to Strava's OAuth authorization page.
 * Stores a CSRF state token in a cookie for validation in the callback.
 */
export async function GET() {
  // Verify user is authenticated
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('Missing STRAVA_CLIENT_ID or STRAVA_REDIRECT_URI env vars');
    return NextResponse.redirect(
      new URL('/profile?strava=error', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    );
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

  // Build Strava OAuth URL
  const stravaAuthUrl = new URL('https://www.strava.com/oauth/authorize');
  stravaAuthUrl.searchParams.set('client_id', clientId);
  stravaAuthUrl.searchParams.set('redirect_uri', redirectUri);
  stravaAuthUrl.searchParams.set('response_type', 'code');
  stravaAuthUrl.searchParams.set('approval_prompt', 'auto');
  stravaAuthUrl.searchParams.set('scope', 'activity:read_all');
  stravaAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(stravaAuthUrl.toString());
}
