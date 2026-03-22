'use client';

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { MessageCircle, Plus, Send, Trash2 } from 'lucide-react';
import { SPORT_CONFIG, EFFORT_LABELS } from '@/lib/sport-config';
import type {
  ActivityFeedItemWithUser,
  FeedReaction,
  FeedCommentWithUser,
  SportType,
  ChallengeMetric,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnhancedFeedItem extends ActivityFeedItemWithUser {
  comments?: FeedCommentWithUser[];
}

export interface EnhancedFeedProps {
  items: EnhancedFeedItem[];
  currentUserId: string;
  maxItems?: number;
  onToggleReaction: (feedItemId: string, emoji: string) => void;
  onAddComment: (feedItemId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REACTION_EMOJIS = ['🔥', '💪', '😤', '👏', '🫡', '💀'] as const;
const COMMENT_MAX_LENGTH = 200;

const METRIC_LABELS: Record<ChallengeMetric, string> = {
  ep: 'EP',
  duration: 'minuter',
  sessions: 'pass',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    case 'boss_attacked': {
      if (data.is_spawn) {
        return `En ny boss har dykt upp! ${data.boss_emoji} ${data.boss_name} (${data.max_hp} HP)`;
      }
      if (data.is_last_stand) {
        return String(data.message || `Last Stand! ${data.boss_emoji} ${data.boss_name} har bara ${data.remaining_hp} HP kvar!`);
      }
      return `attackerade ${data.boss_emoji} ${data.boss_name} för ${data.damage} skada!`;
    }
    case 'boss_critical_hit':
      return `landade en KRITISK TRÄFF på ${data.boss_emoji} ${data.boss_name}! ${data.damage} skada! ⚡`;
    case 'boss_defeated':
      return `${data.boss_emoji} ${data.boss_name} är besegrad! 🎉`;
    case 'boss_failed':
      return `${data.boss_emoji || '💀'} Bossen överlevde veckan... Debuff nästa vecka!`;
    case 'call_out_created':
      return ''; // handled by dedicated renderer
    case 'call_out_won':
      return ''; // handled by dedicated renderer
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
  if (item.event_type === 'boss_attacked' || item.event_type === 'boss_critical_hit') {
    return String(data.boss_emoji || '⚔️');
  }
  if (item.event_type === 'boss_defeated') return '🏆';
  if (item.event_type === 'boss_failed') return '💀';
  if (item.event_type === 'call_out_created') return '⚔️';
  if (item.event_type === 'call_out_won') return '🏆';
  return '🎯';
}

/** Aggregate reactions into { emoji, count, reactedByMe } groups. */
function aggregateReactions(
  reactions: FeedReaction[] | undefined,
  currentUserId: string,
): { emoji: string; count: number; reactedByMe: boolean }[] {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count += 1;
      if (r.user_id === currentUserId) existing.reactedByMe = true;
    } else {
      map.set(r.emoji, { count: 1, reactedByMe: r.user_id === currentUserId });
    }
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    ...data,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Session badges (effort, marathon, monster) */
function SessionBadges({ data }: { data: Record<string, unknown> }) {
  const badges: { label: string; className: string }[] = [];

  // Effort rating emoji
  const effort = data.effort_rating as number | undefined;
  if (effort && EFFORT_LABELS[effort]) {
    badges.push({
      label: `${EFFORT_LABELS[effort].emoji} ${EFFORT_LABELS[effort].label}`,
      className: 'bg-slate-800 text-slate-300',
    });
  }

  // Marathon session (> 60 min)
  const duration = data.duration as number | undefined;
  if (duration && duration > 60) {
    badges.push({
      label: 'Maratonpass! 🏋️',
      className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    });
  }

  // Monster EP (> 30)
  const ep = data.ep as number | undefined;
  if (ep && ep > 30) {
    badges.push({
      label: 'Monsterstark! ⚡',
      className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${b.className}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

/** Call-out challenge card (created) */
function CallOutCreatedCard({ item }: { item: EnhancedFeedItem }) {
  const data = item.event_data as Record<string, unknown>;
  const challengerName = String(data.challenger_name || item.user?.display_name || 'Okänd');
  const challengedName = String(data.challenged_name || 'Okänd');
  const metric = data.metric as ChallengeMetric | undefined;
  const sportType = data.sport_type as SportType | undefined;
  const sport = sportType ? SPORT_CONFIG[sportType] : null;

  return (
    <div className="mt-2 rounded-xl bg-slate-800/80 border border-slate-600 p-3">
      <div className="flex items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-200">{challengerName}</p>
          <p className="text-[10px] text-slate-400">Utmanare</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40">
          <span className="text-xs font-black text-red-400">VS</span>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-200">{challengedName}</p>
          <p className="text-[10px] text-slate-400">Utmanad</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        {sport && (
          <span className="text-xs text-slate-400">
            {sport.icon} {sport.label}
          </span>
        )}
        {metric && (
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
            {METRIC_LABELS[metric] || metric}
          </span>
        )}
      </div>
    </div>
  );
}

/** Call-out won card */
function CallOutWonCard({ item }: { item: EnhancedFeedItem }) {
  const data = item.event_data as Record<string, unknown>;
  const winnerName = String(data.winner_name || 'Okänd');
  const loserName = String(data.loser_name || 'Okänd');
  const metric = data.metric as ChallengeMetric | undefined;

  return (
    <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
      <div className="flex items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-sm font-bold text-emerald-300">🏆 {winnerName}</p>
          <p className="text-[10px] text-emerald-400/70">Vinnare</p>
        </div>
        <span className="text-slate-500">vs</span>
        <div className="text-center">
          <p className="text-sm text-slate-400">{loserName}</p>
        </div>
      </div>
      {metric && (
        <p className="mt-1 text-center text-[10px] text-slate-400">
          Tävling: {METRIC_LABELS[metric] || metric}
        </p>
      )}
    </div>
  );
}

/** Reaction pills + emoji picker */
function ReactionBar({
  itemId,
  reactions,
  currentUserId,
  onToggleReaction,
}: {
  itemId: string;
  reactions: FeedReaction[] | undefined;
  currentUserId: string;
  onToggleReaction: (feedItemId: string, emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const aggregated = aggregateReactions(reactions, currentUserId);

  const handleEmojiTap = useCallback(
    (emoji: string) => {
      onToggleReaction(itemId, emoji);
      setPickerOpen(false);
    },
    [itemId, onToggleReaction],
  );

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {aggregated.map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onToggleReaction(itemId, r.emoji)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
              r.reactedByMe
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="text-[10px] font-medium">{r.count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors"
          aria-label="Lägg till reaktion"
        >
          <Plus size={12} />
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-1.5 flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-2 py-1.5">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiTap(emoji)}
              className="rounded-lg p-1.5 text-base hover:bg-slate-700 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Expandable comments section */
function CommentsSection({
  itemId,
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
}: {
  itemId: string;
  comments: FeedCommentWithUser[] | undefined;
  currentUserId: string;
  onAddComment: (feedItemId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const commentCount = comments?.length ?? 0;

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(itemId, trimmed);
    setText('');
  }, [itemId, text, onAddComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
      >
        <MessageCircle size={12} />
        <span>
          {commentCount === 0
            ? 'Kommentera'
            : commentCount === 1
              ? '1 kommentar'
              : `${commentCount} kommentarer`}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Existing comments */}
          {comments && comments.length > 0 && (
            <div className="space-y-1.5">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">
                      <span className="font-semibold">{c.user?.display_name || 'Okänd'}</span>{' '}
                      <span className="text-slate-400">{c.text}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: sv })}
                    </p>
                  </div>
                  {c.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(c.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                      aria-label="Ta bort kommentar"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Skriv en kommentar..."
              className="flex-1 min-w-0 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-slate-600 transition-colors"
              maxLength={COMMENT_MAX_LENGTH}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex-shrink-0 rounded-xl bg-emerald-600 p-1.5 text-white disabled:opacity-30 hover:bg-emerald-500 transition-colors"
              aria-label="Skicka kommentar"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EnhancedFeed({
  items,
  currentUserId,
  maxItems = 10,
  onToggleReaction,
  onAddComment,
  onDeleteComment,
}: EnhancedFeedProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 text-center">
        <p className="text-sm text-slate-400">Ingen aktivitet ännu. Logga ditt första pass!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {displayItems.map((item) => {
        const data = item.event_data as Record<string, unknown>;
        const isCallOut = item.event_type === 'call_out_created' || item.event_type === 'call_out_won';
        const isLastStand = item.event_type === 'boss_attacked' && data.is_last_stand;
        const isBossDefeated = item.event_type === 'boss_defeated';
        const isBossEvent = item.event_type.startsWith('boss_');

        // Card background variants
        let cardClass = 'rounded-2xl bg-slate-900 border border-slate-700 px-5 py-4';
        if (isLastStand) {
          cardClass = 'rounded-2xl bg-slate-900 border border-rose-500/40 px-5 py-4';
        } else if (isBossDefeated) {
          cardClass = 'rounded-2xl bg-slate-900 border border-amber-400/40 px-5 py-4';
        } else if (isBossEvent) {
          cardClass = 'rounded-2xl bg-slate-900 border border-slate-600 px-5 py-4';
        }

        return (
          <div key={item.id} className={cardClass}>
            {/* Header row */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm">
                {getFeedIcon(item)}
              </div>
              <div className="flex-1 min-w-0">
                {/* Call-out events get special rendering */}
                {item.event_type === 'call_out_created' ? (
                  <>
                    <p className="text-sm text-slate-200">
                      <span className="font-semibold">{item.user?.display_name || 'Okänd'}</span>{' '}
                      utmanade någon!
                    </p>
                    <CallOutCreatedCard item={item} />
                  </>
                ) : item.event_type === 'call_out_won' ? (
                  <>
                    <p className="text-sm text-slate-200">
                      <span className="font-semibold">Utmaning avgjord!</span>
                    </p>
                    <CallOutWonCard item={item} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm text-slate-200">
                        <span className="font-semibold">{item.user?.display_name || 'Okänd'}</span>{' '}
                        {getFeedText(item)}
                      </p>
                      {/* Strava badge */}
                      {item.event_type === 'session_logged' && data.source === 'strava' && (
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

                    {/* Session note */}
                    {item.event_type === 'session_logged' && Boolean(data.note) && (
                      <p className="mt-0.5 text-xs text-slate-400 italic truncate">
                        &quot;{String(data.note)}&quot;
                      </p>
                    )}

                    {/* Session photo */}
                    {item.event_type === 'session_logged' && Boolean(data.photo_url) && (
                      <img
                        src={String(data.photo_url)}
                        alt="Träningsfoto"
                        className="mt-2 w-full h-40 object-cover rounded-lg border border-slate-700"
                      />
                    )}

                    {/* Session badges (effort, marathon, monster) */}
                    {item.event_type === 'session_logged' && <SessionBadges data={data} />}
                  </>
                )}

                {/* Timestamp */}
                <p className="mt-1 text-xs text-slate-500">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: sv })}
                </p>
              </div>
            </div>

            {/* Reactions */}
            <ReactionBar
              itemId={item.id}
              reactions={item.reactions}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
            />

            {/* Comments */}
            <CommentsSection
              itemId={item.id}
              comments={item.comments}
              currentUserId={currentUserId}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
            />
          </div>
        );
      })}
    </div>
  );
}
