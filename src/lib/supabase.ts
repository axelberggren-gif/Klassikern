import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Create a typed Supabase client for use in Client Components.
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data } = await supabase.from('profiles').select('*');
 *   // data is typed as Database['public']['Tables']['profiles']['Row'][]
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
