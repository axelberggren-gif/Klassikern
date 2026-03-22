-- ============================================================================
-- 012: Feed & Leaderboard Features
-- Adds: feed_comments, call_out_challenges tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Feed comments (trash talk / hype on feed items)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_comments_feed_item ON feed_comments(feed_item_id);
CREATE INDEX idx_feed_comments_created ON feed_comments(created_at DESC);

-- RLS for feed_comments
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read comments on feed items in their group
CREATE POLICY "Users can read comments in their group" ON feed_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activity_feed af
      JOIN group_members gm ON gm.group_id = af.group_id
      WHERE af.id = feed_comments.feed_item_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments" ON feed_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON feed_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Call-out challenges (1v1 between group members)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_out_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES auth.users(id),
  challenged_id UUID NOT NULL REFERENCES auth.users(id),
  sport_type TEXT, -- NULL means "all sports"
  metric TEXT NOT NULL DEFAULT 'ep' CHECK (metric IN ('ep', 'duration', 'sessions')),
  challenger_value NUMERIC NOT NULL DEFAULT 0,
  challenged_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_out_group ON call_out_challenges(group_id);
CREATE INDEX idx_call_out_status ON call_out_challenges(status);
CREATE INDEX idx_call_out_week ON call_out_challenges(week_start, week_end);

-- RLS for call_out_challenges
ALTER TABLE call_out_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read challenges" ON call_out_challenges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = call_out_challenges.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create challenges" ON call_out_challenges
  FOR INSERT TO authenticated
  WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "Participants can update challenges" ON call_out_challenges
  FOR UPDATE TO authenticated
  USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
