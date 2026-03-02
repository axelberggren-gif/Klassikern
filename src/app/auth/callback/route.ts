import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Auth callback route handler.
 *
 * Supabase sends users here after they click the magic link in their email.
 * This route exchanges the auth code for a session, then redirects:
 *  - To /onboarding if the user has not completed onboarding (display_name is default)
 *  - To / (dashboard) if onboarding is complete
 *  - To /login?error=auth on failure
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    // No code provided — redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Exchange the auth code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Auth code exchange failed:', exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    // Check if the user has completed onboarding
    // The auto-create trigger sets display_name to 'Ny användare' by default
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const hasCompletedOnboarding =
      profile && profile.display_name && profile.display_name !== 'Ny användare';

    if (hasCompletedOnboarding) {
      return NextResponse.redirect(`${origin}/`);
    } else {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
