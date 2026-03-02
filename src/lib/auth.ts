'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

console.log('[auth.ts] module loaded');

/**
 * Auth state returned by the useAuth hook.
 */
export interface AuthState {
  /** The Supabase Auth user, or null if not authenticated. */
  user: User | null;
  /** The user's profile from the profiles table, or null if not loaded yet. */
  profile: Profile | null;
  /** True while the initial auth check is in progress. */
  loading: boolean;
  /** Signs the user out and redirects to /login. */
  signOut: () => Promise<void>;
}

/**
 * React hook that provides the current auth state.
 *
 * Architecture:
 *  - Effect 1: onAuthStateChange sets the user (synchronous, no DB calls)
 *  - Effect 2: when user changes, fetch profile in a separate async context
 *
 * This avoids a deadlock in @supabase/ssr v0.8.0 where both getSession()
 * and database queries hang when called inside onAuthStateChange.
 */
export function useAuth(): AuthState {
  console.log('[useAuth] hook called');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Effect 1: Listen for auth state changes — synchronous only, no DB calls.
  useEffect(() => {
    console.log('[useAuth] auth effect running');
    const supabase = createClient();
    let isFirstEvent = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] onAuthStateChange:', event, '| hasSession:', !!session);

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      // If no user on initial event, we're done loading
      if (isFirstEvent && !sessionUser) {
        console.log('[useAuth] no user on initial event, setting loading=false');
        setLoading(false);
      }
      isFirstEvent = false;

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Effect 2: Fetch profile when user changes (runs OUTSIDE onAuthStateChange).
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    console.log('[useAuth] user changed, fetching profile for', user.id);
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error || !data) {
          console.error('[useAuth] profile fetch failed:', error?.message ?? 'no data');
          setProfile(null);
          setLoading(false);
          // Redirect to login — don't attempt signOut (it can also fail/hang)
          window.location.href = '/login';
          return;
        }

        console.log('[useAuth] profile loaded:', data.display_name);
        setProfile(data);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.replace('/login');
  }, [router]);

  return { user, profile, loading, signOut };
}
