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

/** Race a promise against a timeout. Rejects if the timeout fires first. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * React hook that provides the current auth state.
 *
 * - Subscribes to Supabase auth state changes
 * - Fetches the user's profile from the profiles table
 * - Handles the case where auth session exists but profile doesn't
 * - Provides a signOut function that clears the session and redirects
 */
export function useAuth(): AuthState {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, retries = 1): Promise<Profile | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[useAuth] fetchProfile error:', error.message, error.code, error);
      if (retries > 0) {
        console.log('[useAuth] Retrying fetchProfile...');
        await new Promise(r => setTimeout(r, 1000));
        return fetchProfile(userId, retries - 1);
      }
      return null;
    }

    if (!data) {
      console.error('[useAuth] fetchProfile: no data returned for user', userId);
      return null;
    }

    return data;
  }, []);

  useEffect(() => {
    const supabase = createClient();
    console.log('[useAuth] initAuth starting...');

    // Get initial session
    const initAuth = async () => {
      try {
        // Add timeout to getUser() — if Supabase is unreachable, don't hang forever
        const {
          data: { user: currentUser },
          error: userError,
        } = await withTimeout(
          supabase.auth.getUser(),
          8000,
          'supabase.auth.getUser()'
        );

        console.log('[useAuth] getUser result:', { hasUser: !!currentUser, error: userError?.message ?? 'none' });

        if (userError) {
          console.error('[useAuth] getUser error:', userError.message);
        }

        setUser(currentUser);

        if (currentUser) {
          const userProfile = await withTimeout(
            fetchProfile(currentUser.id),
            10000,
            'fetchProfile'
          );
          setProfile(userProfile);

          // If no profile exists at all, sign out (admin must create user properly)
          if (!userProfile) {
            console.warn('[useAuth] No profile found, signing out');
            await supabase.auth.signOut();
            window.location.href = '/login';
            return;
          }
        }
      } catch (err) {
        // Auth check failed — timeout, network error, etc.
        console.error('[useAuth] initAuth error:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
