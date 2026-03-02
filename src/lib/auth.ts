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
 * - Subscribes to Supabase auth state changes
 * - Fetches the user's profile from the profiles table
 * - Handles the case where auth session exists but profile doesn't
 *   (redirects to /onboarding)
 * - Provides a signOut function that clears the session and redirects
 */
export function useAuth(): AuthState {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // Profile doesn't exist — user needs onboarding
      return null;
    }

    return data;
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        setUser(currentUser);

        if (currentUser) {
          const userProfile = await fetchProfile(currentUser.id);
          setProfile(userProfile);

          // If profile has default name, redirect to onboarding
          if (!userProfile || userProfile.display_name === 'Ny användare') {
            router.replace('/onboarding');
          }
        }
      } catch {
        // Auth check failed — user is not authenticated
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
