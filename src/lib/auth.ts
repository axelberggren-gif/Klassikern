'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

// Module-level log — runs as soon as this file is imported
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
 * Uses getSession() on the client side (reads local cookies, fast and reliable).
 * The middleware already validates the token with getUser() on every request,
 * so the client doesn't need to re-validate.
 */
export function useAuth(): AuthState {
  console.log('[useAuth] hook called');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[useAuth] fetchProfile starting for', userId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[useAuth] fetchProfile error:', error.message, error.code);
      return null;
    }

    if (!data) {
      console.error('[useAuth] fetchProfile: no data returned for user', userId);
      return null;
    }

    console.log('[useAuth] fetchProfile success:', data.display_name);
    return data;
  }, []);

  useEffect(() => {
    console.log('[useAuth] useEffect running');
    const supabase = createClient();

    // Get initial session using getSession() — reads from cookies, never hangs.
    // The middleware already calls getUser() to validate the token server-side.
    const initAuth = async () => {
      console.log('[useAuth] initAuth starting');
      try {
        console.log('[useAuth] calling getSession...');
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log('[useAuth] getSession returned:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          error: sessionError?.message ?? null,
        });

        if (sessionError) {
          console.error('[useAuth] getSession error:', sessionError.message);
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await fetchProfile(currentUser.id);
          setProfile(userProfile);

          if (!userProfile) {
            console.warn('[useAuth] No profile found, signing out');
            await supabase.auth.signOut();
            window.location.href = '/login';
            return;
          }
        } else {
          console.log('[useAuth] No session found, user is null');
        }
      } catch (err) {
        console.error('[useAuth] initAuth error:', err);
        setUser(null);
        setProfile(null);
      } finally {
        console.log('[useAuth] initAuth finished, setting loading=false');
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] onAuthStateChange:', event, !!session);
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        const userProfile = await fetchProfile(sessionUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, router]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.replace('/login');
  }, [router]);

  return { user, profile, loading, signOut };
}
