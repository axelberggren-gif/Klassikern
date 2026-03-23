import { createClient } from '@/lib/supabase';
import type { NotificationType, NotificationPreferences } from '@/types/database';
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
