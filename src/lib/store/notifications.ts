import { createClient } from '@/lib/supabase';
import type { NotificationType, NotificationPreferences, InAppNotification } from '@/types/database';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Notification preferences (stored in profiles.notification_preferences)
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching notification preferences:', error);
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  // Merge with defaults to handle any new notification types added later
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(data.notification_preferences as NotificationPreferences),
  };
}

export async function updateNotificationPreference(
  userId: string,
  type: NotificationType,
  enabled: boolean
): Promise<boolean> {
  const supabase = createClient();

  // Fetch current preferences
  const current = await getNotificationPreferences(userId);
  const updated = { ...current, [type]: enabled };

  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: updated })
    .eq('id', userId);

  if (error) {
    console.error('Error updating notification preference:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// In-app notification log
// ---------------------------------------------------------------------------

export async function insertNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    url: params.url ?? '/',
  });

  if (error) {
    console.error('Error inserting notification:', error);
  }
}

export async function getNotifications(
  userId: string,
  limit = 30
): Promise<InAppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking notifications as read:', error);
  }
}

export async function markRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing notifications:', error);
  }
}

export async function updateAllNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: preferences })
    .eq('id', userId);

  if (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
  return true;
}
