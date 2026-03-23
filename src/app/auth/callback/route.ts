import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Handles Supabase auth callbacks (email confirmation, password recovery, etc.).
 *
 * Supabase sends users here with a `token_hash` and `type` query param.
 * We exchange the token for a session, then redirect based on the flow type.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email' | 'signup',
    });

    if (!error) {
      if (type === 'recovery') {
        // Password reset flow — redirect to the reset password page
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      // Other flows (email confirm, etc.) — redirect to the app
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If token exchange failed, redirect to login with an error
  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
