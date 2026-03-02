'use client';

import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { ActivityFeedItemWithUser } from '@/types/database';

interface ActivityFeedProps {
  items: ActivityFeedItemWithUser[];
  maxItems?: number;
}

function getFeedText(item: ActivityFeedItemWithUser): string {
  const data = item.event_data as Record<string, unknown>;
  switch (item.event_type) {
    case 'session_logged': {
      const sport = SPORT_CONFIG[data.sport_type as keyof typeof SPORT_CONFIG];
      return `slutförde ${sport?.label.toLowerCase() || 'ett pass'} (${data.duration} min) · +${data.ep} EP`;
    }
    case 'streak_milestone':
      return `nådde ${data.streak} dagars streak! 🔥`;
    case 'badge_earned':
      return `låste upp "${data.badge_name}"! 🏅`;
    case 'waypoint_reached':
      return `nådde ${data.waypoint_name} på kartan! 📍`;
    case 'challenge_completed':
      return `klarade veckoutmaningen! 🎯`;
    default:
      return 'gjorde något fantastiskt!';
  }
}

function getFeedIcon(item: ActivityFeedItemWithUser): string {
  const data = item.event_data as Record<string, unknown>;
  if (item.event_type === 'session_logged') {
    const sport = SPORT_CONFIG[data.sport_type as keyof typeof SPORT_CONFIG];
    return sport?.icon || '⭐';
  }
  if (item.event_type === 'streak_milestone') return '🔥';
  if (item.event_type === 'badge_earned') return '🏅';
  if (item.event_type === 'waypoint_reached') return '📍';
  return '🎯';
}

export default function ActivityFeed({ items, maxItems = 5 }: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 p-5 text-center shadow-sm">
        <p className="text-sm text-gray-400">Ingen aktivitet ännu. Logga ditt första pass!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">Gruppaktivitet</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-5 py-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
              {getFeedIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{item.user?.display_name || 'Okänd'}</span>{' '}
                {getFeedText(item)}
              </p>
              {item.event_type === 'session_logged' && Boolean((item.event_data as Record<string, unknown>).note) && (
                <p className="mt-0.5 text-xs text-gray-400 italic truncate">
                  &quot;{String((item.event_data as Record<string, unknown>).note)}&quot;
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-400">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: sv })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
