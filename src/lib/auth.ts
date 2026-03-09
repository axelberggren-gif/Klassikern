'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

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
 *  - Effect 1: getSession() for initial check + onAuthStateChange for updates
 *  - Effect 2: when user changes, fetch profile in a separate async context
 *
 * This split avoids a deadlock in @supabase/ssr where both getSession()
 * and database queries hang when called inside onAuthStateChange.
 */
export function useAuth(): AuthState {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Effect 1: Get initial user + listen for auth state changes.
  // No DB calls here — profile fetching happens in Effect 2.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Use getUser() for the initial check — it makes a server call to validate
    // the token, which is more reliable than getSession() (cookie-only) on
    // preview/staging deployments where service workers or deployment
    // protection can interfere with cookie-based auth.
    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError) {
          console.error('[useAuth] getUser error:', userError.message);
        }

        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
          const pathname = window.location.pathname;
          if (pathname !== '/login' && pathname !== '/onboarding') {
            router.replace('/login');
          }
        }
        // If currentUser exists, loading stays true until Effect 2 fetches profile
      } catch (err) {
        if (cancelled) return;
        console.error('[useAuth] initAuth error:', err);
        setUser(null);
        setProfile(null);
        setLoading(false);
        const pathname = window.location.pathname;
        if (pathname !== '/login' && pathname !== '/onboarding') {
          router.replace('/login');
        }
      }
    };

    initAuth();

    // Subscribe to auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
        router.replace('/login');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  // Effect 2: Fetch profile when user changes (runs OUTSIDE onAuthStateChange).
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

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
          // Don't sign out or redirect — this would cause an infinite loop.
          // Profile might fail due to RLS or transient errors.
          console.error('[useAuth] profile fetch failed:', error?.message ?? 'no data');
          setProfile(null);
          setLoading(false);
          return;
        }

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
