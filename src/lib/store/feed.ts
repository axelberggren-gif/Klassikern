import { createClient } from '@/lib/supabase';
import type {
  Profile,
  FeedReaction,
  FeedCommentWithUser,
  CallOutChallengeWithUsers,
  ActivityFeedItemWithUser,
  SportType,
  ChallengeMetric,
} from '@/types/database';

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

  const feedItems = data.map((item) => {
    const { profiles, ...feedFields } = item as Record<string, unknown>;
    return {
      ...feedFields,
      user: profiles as Profile,
    } as ActivityFeedItemWithUser;
  });

  // Batch-fetch reactions and comments for all feed items
  const feedItemIds = feedItems.map((item) => item.id);
  if (feedItemIds.length > 0) {
    const [reactions, comments] = await Promise.all([
      getFeedReactions(feedItemIds),
      getBatchFeedComments(feedItemIds),
    ]);

    const reactionsByFeedItem = new Map<string, FeedReaction[]>();
    for (const reaction of reactions) {
      const existing = reactionsByFeedItem.get(reaction.feed_item_id) ?? [];
      existing.push(reaction);
      reactionsByFeedItem.set(reaction.feed_item_id, existing);
    }

    const commentsByFeedItem = new Map<string, FeedCommentWithUser[]>();
    for (const comment of comments) {
      const existing = commentsByFeedItem.get(comment.feed_item_id) ?? [];
      existing.push(comment);
      commentsByFeedItem.set(comment.feed_item_id, existing);
    }

    for (const item of feedItems) {
      item.reactions = reactionsByFeedItem.get(item.id) ?? [];
      item.comments = commentsByFeedItem.get(item.id) ?? [];
    }
  }

  return feedItems;
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Toggle a reaction on a feed item. If the user already reacted with the same
 * emoji, the reaction is removed. Otherwise it is upserted.
 * Returns `true` if the reaction now exists, `false` if it was removed.
 */
export async function toggleReaction(
  feedItemId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  const supabase = createClient();

  // Check for existing reaction with this emoji
  const { data: existing } = await supabase
    .from('feed_reactions')
    .select('id')
    .eq('feed_item_id', feedItemId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    // Remove existing reaction
    const { error } = await supabase
      .from('feed_reactions')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('Error removing reaction:', error);
    }
    return false;
  }

  // Insert new reaction
  const { error } = await supabase.from('feed_reactions').insert({
    feed_item_id: feedItemId,
    user_id: userId,
    emoji,
  });

  if (error) {
    console.error('Error adding reaction:', error);
    return false;
  }
  return true;
}

/**
 * Batch-fetch reactions for multiple feed items.
 */
export async function getFeedReactions(
  feedItemIds: string[]
): Promise<FeedReaction[]> {
  if (feedItemIds.length === 0) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from('feed_reactions')
    .select('*')
    .in('feed_item_id', feedItemIds);

  if (error || !data) {
    console.error('Error fetching feed reactions:', error);
    return [];
  }

  return data as FeedReaction[];
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/**
 * Batch-fetch comments for multiple feed items, ordered oldest first.
 * Uses a two-step approach (comments + profiles) to avoid FK join issues.
 */
async function getBatchFeedComments(
  feedItemIds: string[]
): Promise<FeedCommentWithUser[]> {
  if (feedItemIds.length === 0) return [];

  const supabase = createClient();

  const { data: comments, error } = await supabase
    .from('feed_comments')
    .select('*')
    .in('feed_item_id', feedItemIds)
    .order('created_at', { ascending: true });

  if (error || !comments || comments.length === 0) {
    if (error) console.error('Error batch-fetching feed comments:', error);
    return [];
  }

  // Fetch profiles for all comment authors
  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map<string, Profile>();
  for (const p of (profiles || []) as Profile[]) {
    profileMap.set(p.id, p);
  }

  return comments.map((c) => ({
    ...c,
    user: profileMap.get(c.user_id) as Profile,
  })) as FeedCommentWithUser[];
}

/**
 * Get comments for a feed item, including user profiles, ordered oldest first.
 */
export async function getFeedComments(
  feedItemId: string
): Promise<FeedCommentWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feed_comments')
    .select('*, profiles(*)')
    .eq('feed_item_id', feedItemId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching feed comments:', error);
    return [];
  }

  return data.map((item) => {
    const { profiles, ...commentFields } = item as Record<string, unknown>;
    return {
      ...commentFields,
      user: profiles as Profile,
    } as FeedCommentWithUser;
  });
}

/**
 * Add a comment to a feed item. Text is truncated to 200 characters.
 * Returns the raw comment row (without profile join) or null on failure.
 */
export async function addFeedComment(
  feedItemId: string,
  userId: string,
  text: string
): Promise<{ id: string; feed_item_id: string; user_id: string; text: string; created_at: string } | null> {
  const supabase = createClient();
  const trimmedText = text.slice(0, 200);

  const { data, error } = await supabase
    .from('feed_comments')
    .insert({
      feed_item_id: feedItemId,
      user_id: userId,
      text: trimmedText,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error adding feed comment:', error);
    return null;
  }

  return data as { id: string; feed_item_id: string; user_id: string; text: string; created_at: string };
}

/**
 * Delete a comment by ID.
 */
export async function deleteFeedComment(commentId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting feed comment:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Call-out challenges
// ---------------------------------------------------------------------------

/**
 * Get the Monday 00:00 and Sunday 23:59:59 of the current week (ISO weeks,
 * Monday-based).
 */
function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  };
}

/**
 * Get active (current-week) call-out challenges for a group, with user profiles.
 */
export async function getActiveChallenges(
  groupId: string
): Promise<CallOutChallengeWithUsers[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('call_out_challenges')
    .select(
      '*, challenger:profiles!call_out_challenges_challenger_id_fkey(*), challenged:profiles!call_out_challenges_challenged_id_fkey(*)'
    )
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching active challenges:', error);
    return [];
  }

  return data.map((item) => {
    const { challenger, challenged, ...rest } = item as Record<string, unknown>;
    return {
      ...rest,
      challenger: challenger as Profile,
      challenged: challenged as Profile,
    } as CallOutChallengeWithUsers;
  });
}

/**
 * Create a new call-out challenge and post a feed event.
 */
export async function createCallOut(params: {
  groupId: string;
  challengerId: string;
  challengedId: string;
  sportType?: SportType | null;
  metric: ChallengeMetric;
}): Promise<CallOutChallengeWithUsers | null> {
  const supabase = createClient();
  const { weekStart, weekEnd } = getWeekBounds();

  const { data, error } = await supabase
    .from('call_out_challenges')
    .insert({
      group_id: params.groupId,
      challenger_id: params.challengerId,
      challenged_id: params.challengedId,
      sport_type: params.sportType ?? null,
      metric: params.metric,
      week_start: weekStart,
      week_end: weekEnd,
    })
    .select(
      '*, challenger:profiles!call_out_challenges_challenger_id_fkey(*), challenged:profiles!call_out_challenges_challenged_id_fkey(*)'
    )
    .single();

  if (error || !data) {
    console.error('Error creating call-out challenge:', error);
    return null;
  }

  // Post activity feed event
  await supabase.from('activity_feed').insert({
    group_id: params.groupId,
    user_id: params.challengerId,
    event_type: 'call_out_created' as const,
    event_data: {
      challenge_id: data.id,
      challenged_id: params.challengedId,
      sport_type: params.sportType ?? null,
      metric: params.metric,
    },
  });

  const { challenger, challenged, ...rest } = data as Record<string, unknown>;
  return {
    ...rest,
    challenger: challenger as Profile,
    challenged: challenged as Profile,
  } as CallOutChallengeWithUsers;
}

/**
 * Get completed challenges for a group, most recent first.
 */
export async function getChallengeHistory(
  groupId: string
): Promise<CallOutChallengeWithUsers[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('call_out_challenges')
    .select(
      '*, challenger:profiles!call_out_challenges_challenger_id_fkey(*), challenged:profiles!call_out_challenges_challenged_id_fkey(*)'
    )
    .eq('group_id', groupId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error || !data) {
    console.error('Error fetching challenge history:', error);
    return [];
  }

  return data.map((item) => {
    const { challenger, challenged, ...rest } = item as Record<string, unknown>;
    return {
      ...rest,
      challenger: challenger as Profile,
      challenged: challenged as Profile,
    } as CallOutChallengeWithUsers;
  });
}
