'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { getUserGroupId, getNotificationPreferences } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { notify, getPermissionState } from '@/lib/notifications';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { FeedEventType, NotificationPreferences } from '@/types/database';

/**
 * Subscribes to Supabase Realtime on the activity_feed table for the user's
 * group and shows notifications for events triggered by other users.
 */
export default function RealtimeNotifications() {
  const { user, profile } = useAuth();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    if (getPermissionState() !== 'granted') return;

    let cancelled = false;

    async function subscribe() {
      const groupId = await getUserGroupId(user!.id);
      if (!groupId || cancelled) return;

      const prefs = await getNotificationPreferences(user!.id);
      if (cancelled) return;

      const supabase = createClient();
      const channel = supabase
        .channel(`group-notifications-${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_feed',
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            const row = payload.new as {
              user_id: string;
              event_type: FeedEventType;
              event_data: Record<string, unknown>;
            };

            // Don't notify for own actions
            if (row.user_id === user!.id) return;

            handleFeedEvent(row.event_type, row.event_data, prefs);
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, profile]);

  return null;
}

function handleFeedEvent(
  eventType: FeedEventType,
  data: Record<string, unknown>,
  prefs: NotificationPreferences
) {
  switch (eventType) {
    case 'session_logged': {
      const sportType = data.sport_type as string;
      const sportLabel = SPORT_CONFIG[sportType as keyof typeof SPORT_CONFIG]?.label ?? sportType;
      const duration = data.duration as number;
      const ep = data.ep as number;
      // We don't have the user's name here from the event_data, so use a generic message
      notify(
        'teammate_session',
        prefs,
        'Lagkamrat tranade!',
        `${sportLabel} ${duration} min — ${ep} EP`,
        `teammate-session-${Date.now()}`,
        { url: '/' }
      );
      break;
    }

    case 'boss_defeated': {
      const bossEmoji = data.boss_emoji as string;
      const totalAttackers = data.total_attackers as number;
      notify(
        'boss_defeated',
        prefs,
        `${bossEmoji} Boss besegrad!`,
        `Gruppen besegrade bossen med ${totalAttackers} attackerare`,
        'boss-defeated',
        { url: '/group' }
      );
      break;
    }

    case 'boss_attacked': {
      const bossName = data.boss_name as string;
      const bossEmoji = data.boss_emoji as string;
      const damage = data.damage as number;
      const remainingHp = data.remaining_hp as number;
      const maxHp = data.max_hp as number;
      const pct = Math.round((remainingHp / maxHp) * 100);
      if (remainingHp <= maxHp * 0.1 && remainingHp > 0) {
        notify(
          'boss_low_hp',
          prefs,
          `${bossEmoji} ${bossName} ar nastan klar!`,
          `Bara ${pct}% HP kvar efter ${damage} skada`,
          'boss-low-hp',
          { url: '/group' }
        );
      }
      break;
    }

    case 'badge_earned':
      notify(
        'badge_unlocked',
        prefs,
        'Lagkamrat fick badge!',
        (data.badge_name as string) ?? '',
        `teammate-badge-${Date.now()}`,
        { url: '/group' }
      );
      break;

    case 'streak_milestone':
      // Streak milestones for teammates — no separate notification needed
      break;

    default:
      break;
  }
}
