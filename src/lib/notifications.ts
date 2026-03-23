import type { NotificationType, NotificationPreferences } from '@/types/database';

// ---------------------------------------------------------------------------
// Default preferences (all enabled)
// ---------------------------------------------------------------------------

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  session_logged: true,
  streak_milestone: true,
  streak_at_risk: true,
  streak_lost: true,
  boss_defeated: true,
  boss_killing_blow: true,
  boss_new: true,
  boss_weakness_hit: true,
  boss_low_hp: true,
  badge_unlocked: true,
  boss_trophy_earned: true,
  group_member_joined: true,
  group_member_left: true,
  teammate_session: true,
  leaderboard_overtaken: true,
  race_milestone: true,
  strava_sync_complete: true,
  strava_sync_failed: true,
  goal_updated: true,
};

// ---------------------------------------------------------------------------
// Notification category definitions (for Settings UI)
// ---------------------------------------------------------------------------

export interface NotificationCategory {
  key: string;
  label: string;
  items: { type: NotificationType; label: string }[];
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'session',
    label: 'Traning & Streaks',
    items: [
      { type: 'session_logged', label: 'Pass loggat' },
      { type: 'streak_milestone', label: 'Streak-milepael' },
      { type: 'streak_at_risk', label: 'Streak raddad i sista stund' },
      { type: 'streak_lost', label: 'Streak bruten' },
    ],
  },
  {
    key: 'boss',
    label: 'Boss-strider',
    items: [
      { type: 'boss_defeated', label: 'Boss besegrad' },
      { type: 'boss_killing_blow', label: 'Du gav dodsstoten' },
      { type: 'boss_new', label: 'Ny boss har dykt upp' },
      { type: 'boss_weakness_hit', label: 'Svaghet traffad' },
      { type: 'boss_low_hp', label: 'Boss har lagt HP' },
    ],
  },
  {
    key: 'achievements',
    label: 'Prestationer',
    items: [
      { type: 'badge_unlocked', label: 'Badge upplast' },
      { type: 'boss_trophy_earned', label: 'Boss-trofe' },
    ],
  },
  {
    key: 'group',
    label: 'Grupp',
    items: [
      { type: 'group_member_joined', label: 'Ny medlem i gruppen' },
      { type: 'group_member_left', label: 'Medlem lamnade gruppen' },
      { type: 'teammate_session', label: 'Lagkamrat tranade' },
      { type: 'leaderboard_overtaken', label: 'Omkorad pa topplistan' },
    ],
  },
  {
    key: 'race',
    label: 'Tavlingar',
    items: [
      { type: 'race_milestone', label: 'Traning mot tavling' },
    ],
  },
  {
    key: 'strava',
    label: 'Strava',
    items: [
      { type: 'strava_sync_complete', label: 'Synk lyckades' },
      { type: 'strava_sync_failed', label: 'Synk misslyckades' },
    ],
  },
  {
    key: 'profile',
    label: 'Profil',
    items: [
      { type: 'goal_updated', label: 'Mal uppdaterat' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Browser Notification API helpers
// ---------------------------------------------------------------------------

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return Notification.requestPermission();
}

// ---------------------------------------------------------------------------
// Show browser notification via service worker
// ---------------------------------------------------------------------------

async function showBrowserNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  if (getPermissionState() !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: options?.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: options?.tag,
      data: options?.data ?? {},
    });
  } catch (err) {
    console.error('Error showing browser notification:', err);
  }
}

// ---------------------------------------------------------------------------
// Notification dispatch — writes to DB (in-app log) + browser notification
// ---------------------------------------------------------------------------

export async function notify(
  type: NotificationType,
  preferences: NotificationPreferences | undefined,
  title: string,
  body?: string,
  tag?: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Use default preferences if none provided
  const prefs = preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
  if (!prefs[type]) return;

  const url = (data?.url as string) ?? '/';

  // Write to in-app notification log (import dynamically to avoid circular deps)
  const userId = data?.userId as string | undefined;
  if (userId) {
    const { insertNotification } = await import('@/lib/store/notifications');
    insertNotification({ userId, type, title, body, url }).catch((err) =>
      console.error('Error saving notification to DB:', err)
    );
  }

  // Attempt browser notification (no-op if permission not granted or SW not ready)
  showBrowserNotification(title, { body, tag, data });
}
