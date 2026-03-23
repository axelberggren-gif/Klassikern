-- 015: In-app notification log
-- Stores all notifications per user with read/unread state

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  url text DEFAULT '/',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching user's notifications ordered by time
CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Index for counting unread
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false;

-- RLS: users can only see/update their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-cleanup: delete notifications older than 30 days (run manually or via cron)
-- DELETE FROM notifications WHERE created_at < now() - interval '30 days';

NOTIFY pgrst, 'reload schema';
