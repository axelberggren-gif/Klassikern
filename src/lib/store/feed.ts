import { createClient } from '@/lib/supabase';
import type { Profile, ActivityFeedItemWithUser } from '@/types/database';

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export async function getActivityFeed(
  groupId: string
): Promise<ActivityFeedItemWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, profiles(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error('Error fetching activity feed:', error);
    return [];
  }

  return data.map((item) => {
    const { profiles, ...feedFields } = item as Record<string, unknown>;
    return {
      ...feedFields,
      user: profiles as Profile,
    } as ActivityFeedItemWithUser;
  });
}
