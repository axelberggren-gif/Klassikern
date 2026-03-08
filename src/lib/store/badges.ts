import { createClient } from '@/lib/supabase';
import type { Badge, UserBadgeWithBadge } from '@/types/database';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export async function getAllBadges(): Promise<Badge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('category')
    .order('name');

  if (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
  return data ?? [];
}

export async function getUserBadges(userId: string): Promise<UserBadgeWithBadge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching user badges:', error);
    return [];
  }

  return data.map((item) => {
    const { badges: badgeData, ...userBadgeFields } = item as Record<string, unknown>;
    return {
      ...userBadgeFields,
      badge: badgeData as Badge,
    } as UserBadgeWithBadge;
  });
}
