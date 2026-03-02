import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Create a typed Supabase client for use in Server Components,
 * Server Actions, and Route Handlers.
 *
 * Must be called within a request context (where cookies() is available).
 *
 * Usage:
 *   const supabase = await createServerSupabaseClient();
 *   const { data } = await supabase.from('sessions').select('*');
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from Server Components where setting cookies
            // is not possible. This can be ignored if middleware is refreshing sessions.
          }
        },
      },
    }
  );
}
