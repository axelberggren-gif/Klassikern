'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getNotifications, getUnreadCount, markAllRead, clearAllNotifications } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import type { InAppNotification } from '@/types/database';

// Notification type → icon emoji mapping
const TYPE_ICONS: Record<string, string> = {
  session_logged: '💪',
  streak_milestone: '🔥',
  streak_at_risk: '⚠️',
  streak_lost: '💔',
  boss_defeated: '⚔️',
  boss_killing_blow: '🗡️',
  boss_new: '👹',
  boss_weakness_hit: '✨',
  boss_low_hp: '💥',
  badge_unlocked: '🏅',
  boss_trophy_earned: '🏆',
  group_member_joined: '👋',
  group_member_left: '🚪',
  teammate_session: '🤝',
  leaderboard_overtaken: '📊',
  race_milestone: '🏁',
  strava_sync_complete: '🔄',
  strava_sync_failed: '❌',
  goal_updated: '🎯',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just nu';
  if (minutes < 60) return `${minutes} min sedan`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h sedan`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d sedan`;

  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  const refreshUnread = useCallback(async () => {
    if (!user) return;
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    refreshUnread();
    // Poll every 30s for unread count
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  // Subscribe to realtime inserts on the notifications table
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as InAppNotification;
          setUnreadCount((c) => c + 1);
          // If the feed is open, prepend the new notification
          setNotifications((prev) => [row, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load notifications when feed opens
  async function handleOpen() {
    if (!user) return;
    setOpen(true);
    setLoading(true);
    const items = await getNotifications(user.id, 50);
    setNotifications(items);
    setLoading(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllRead(user.id);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleClear() {
    if (!user) return;
    await clearAllNotifications(user.id);
    setNotifications([]);
    setUnreadCount(0);
  }

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 transition-colors active:bg-slate-700"
      >
        <Bell size={18} className="text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification feed panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-h-[70vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-50">Notifikationer</h3>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={handleMarkAllRead}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                    title="Markera alla som lasta"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Rensa alla"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell size={28} className="text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">Inga notifikationer an</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 transition-colors ${
                      notif.is_read ? 'opacity-60' : 'bg-slate-800/30'
                    }`}
                  >
                    <span className="text-base mt-0.5 shrink-0">
                      {TYPE_ICONS[notif.type] ?? '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-tight">
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
