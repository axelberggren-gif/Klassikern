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
      return `slutforde ${sport?.label.toLowerCase() || 'ett pass'} (${data.duration} min) · +${data.ep} EP`;
    }
    case 'streak_milestone':
      return `nadde ${data.streak} dagars streak! 🔥`;
    case 'badge_earned':
      return `laste upp "${data.badge_name}"! 🏅`;
    case 'waypoint_reached':
      return `nadde ${data.waypoint_name} pa kartan! 📍`;
    case 'challenge_completed':
      return `klarade veckoutmaningen! 🎯`;
    case 'boss_attacked': {
      if (data.is_spawn) {
        return `En ny boss har dykt upp! ${data.boss_emoji} ${data.boss_name} (${data.max_hp} HP)`;
      }
      if (data.is_last_stand) {
        return String(data.message || `Last Stand! ${data.boss_emoji} ${data.boss_name} har bara ${data.remaining_hp} HP kvar!`);
      }
      return `attackerade ${data.boss_emoji} ${data.boss_name} for ${data.damage} skada!`;
    }
    case 'boss_critical_hit':
      return `landade en KRITISK TRAFF pa ${data.boss_emoji} ${data.boss_name}! ${data.damage} skada! ⚡`;
    case 'boss_defeated':
      return `${data.boss_emoji} ${data.boss_name} ar besegrad! 🎉`;
    case 'boss_failed':
      return `${data.boss_emoji || '💀'} Bossen overlevde veckan... Debuff nasta vecka!`;
    default:
      return 'gjorde nagot fantastiskt!';
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
  if (item.event_type === 'boss_attacked' || item.event_type === 'boss_critical_hit') {
    return String(data.boss_emoji || '⚔️');
  }
  if (item.event_type === 'boss_defeated') return '🏆';
  if (item.event_type === 'boss_failed') return '💀';
  return '🎯';
}

export default function ActivityFeed({ items, maxItems = 5 }: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 text-center">
        <p className="text-sm text-slate-400">Ingen aktivitet annu. Logga ditt forsta pass!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-200">Gruppaktivitet</h3>
      </div>
      <div className="divide-y divide-slate-800">
        {displayItems.map((item) => {
          const data = item.event_data as Record<string, unknown>;
          const isLastStand = item.event_type === 'boss_attacked' && data.is_last_stand;
          const isBossDefeated = item.event_type === 'boss_defeated';
          const isBossEvent = item.event_type.startsWith('boss_');
          const rowClass = isLastStand
            ? 'flex items-start gap-3 px-5 py-3 bg-rose-500/10'
            : isBossDefeated
              ? 'flex items-start gap-3 px-5 py-3 bg-amber-400/10'
              : isBossEvent
                ? 'flex items-start gap-3 px-5 py-3 bg-slate-800/50'
                : 'flex items-start gap-3 px-5 py-3';
          return (
          <div key={item.id} className={rowClass}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm">
              {getFeedIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm text-slate-200">
                  <span className="font-semibold">{item.user?.display_name || 'Okand'}</span>{' '}
                  {getFeedText(item)}
                </p>
                {item.event_type === 'session_logged' && (item.event_data as Record<string, unknown>).source === 'strava' && (
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: '#FC4C02' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l3.65 7.215 3.648-7.215H14.61L10.463 0 6.322 8.229h2.95" />
                    </svg>
                    Strava
                  </span>
                )}
              </div>
              {item.event_type === 'session_logged' && Boolean((item.event_data as Record<string, unknown>).note) && (
                <p className="mt-0.5 text-xs text-slate-400 italic truncate">
                  &quot;{String((item.event_data as Record<string, unknown>).note)}&quot;
                </p>
              )}
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: sv })}
              </p>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
