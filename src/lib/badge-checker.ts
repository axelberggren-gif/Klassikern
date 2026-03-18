import { createClient } from '@/lib/supabase';
import type { Badge, Session, Profile } from '@/types/database';

// ---------------------------------------------------------------------------
// Badge condition checkers
// ---------------------------------------------------------------------------
// Each function receives the user's profile and session history and returns
// true if the badge should be awarded.
// ---------------------------------------------------------------------------

type BadgeCondition = (profile: Profile, sessions: Session[]) => boolean;

const BADGE_CONDITIONS: Record<string, BadgeCondition> = {
  // -- Consistency badges --
  'Första passet': (_profile, sessions) => sessions.length >= 1,
  '7-dagars streak': (profile) => profile.longest_streak >= 7,
  '30-dagars streak': (profile) => profile.longest_streak >= 30,
  '100 EP': (profile) => profile.total_ep >= 100,
  '500 EP': (profile) => profile.total_ep >= 500,
  '1000 EP': (profile) => profile.total_ep >= 1000,

  // -- Sport badges --
  'Cykelkung': (_profile, sessions) =>
    sessions.filter((s) => s.sport_type === 'cycling').length >= 10,
  'Löparlegend': (_profile, sessions) =>
    sessions.filter((s) => s.sport_type === 'running').length >= 10,
  'Simmare': (_profile, sessions) =>
    sessions.filter((s) => s.sport_type === 'swimming').length >= 10,

  // -- Special badges --
  'Klassiker Komplett': (_profile, sessions) => {
    const types = new Set(sessions.map((s) => s.sport_type));
    // The four "Klassiker" disciplines. We treat 'hiit' as a stand-in
    // for cross-country skiing (not yet in schema) — the spec says "all
    // 4 race types logged", meaning cycling, running, swimming, and one
    // more. We check for the three classic disciplines plus hiit or other
    // to be generous.
    return (
      types.has('cycling') &&
      types.has('running') &&
      types.has('swimming') &&
      (types.has('hiit') || types.has('other'))
    );
  },
};

// ---------------------------------------------------------------------------
// Main badge-checking function
// ---------------------------------------------------------------------------

/**
 * Checks all badge conditions for a user and awards any newly earned badges.
 *
 * @param userId - The ID of the user to check badges for.
 * @returns An array of badge names that were newly awarded during this call.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const supabase = createClient();

  // 1. Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Badge checker: could not fetch profile', profileError);
    return [];
  }

  // 2. Fetch all user sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId);

  if (sessionsError) {
    console.error('Badge checker: could not fetch sessions', sessionsError);
    return [];
  }

  // 3. Fetch all badge definitions
  const { data: allBadges, error: badgesError } = await supabase
    .from('badges')
    .select('*');

  if (badgesError || !allBadges) {
    console.error('Badge checker: could not fetch badges', badgesError);
    return [];
  }

  // 4. Fetch already-earned badge IDs
  const { data: existingUserBadges, error: existingError } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  if (existingError) {
    console.error('Badge checker: could not fetch user badges', existingError);
    return [];
  }

  const earnedBadgeIds = new Set(
    (existingUserBadges ?? []).map((ub) => ub.badge_id)
  );

  // 5. Check each badge condition
  const newlyEarned: string[] = [];

  // 5a. Check if user has a Strava connection (for the "Strava Kopplad" badge)
  const { data: stravaConn } = await supabase
    .from('strava_connections')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  const hasStravaConnected = !!stravaConn;

  for (const badge of allBadges as Badge[]) {
    // Skip already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    // Special case: Strava Kopplad requires a live DB check
    if (badge.name === 'Strava Kopplad') {
      if (!hasStravaConnected) continue;
    } else {
      const condition = BADGE_CONDITIONS[badge.name];
      if (!condition) continue;
      if (!condition(profile, sessions ?? [])) continue;
    }

    // Award the badge
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert({ user_id: userId, badge_id: badge.id });

    if (insertError) {
      // Could be a unique constraint violation if a race condition occurs
      console.error(`Badge checker: could not award "${badge.name}"`, insertError);
      continue;
    }

    newlyEarned.push(badge.name);

    // Post to activity feed if user has a group
    await postBadgeFeedEvent(userId, badge);
  }

  return newlyEarned;
}

// ---------------------------------------------------------------------------
// Helper: post badge_earned event to activity feed
// ---------------------------------------------------------------------------

async function postBadgeFeedEvent(userId: string, badge: Badge): Promise<void> {
  const supabase = createClient();

  // Find the user's group (if any)
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!membership) return;

  await supabase.from('activity_feed').insert({
    group_id: membership.group_id,
    user_id: userId,
    event_type: 'badge_earned',
    event_data: {
      badge_name: badge.name,
      badge_icon_key: badge.icon_key,
      badge_description: badge.description,
    },
  });
}
