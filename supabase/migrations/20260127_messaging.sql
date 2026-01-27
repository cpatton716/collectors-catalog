-- ============================================================================
-- MESSAGING SYSTEM MIGRATION - Phase 1
-- ============================================================================
-- Creates core tables for peer-to-peer messaging:
-- - conversations: One per user pair, tracks last activity
-- - messages: Individual messages with listing context
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique conversation per user pair (ordered for consistency)
  CONSTRAINT unique_conversation UNIQUE (participant_1_id, participant_2_id),
  -- Ensure participant_1_id < participant_2_id for canonical ordering
  CONSTRAINT ordered_participants CHECK (participant_1_id < participant_2_id)
);

-- Indexes for conversation lookups
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- ============================================================================
-- STEP 2: CREATE MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,

  -- Listing context ("Regarding: Amazing Spider-Man #300")
  listing_id UUID REFERENCES auctions(id) ON DELETE SET NULL,

  -- Read status (for recipient)
  is_read BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message queries
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see conversations they're part of
CREATE POLICY "conversations_select_policy" ON conversations
  FOR SELECT USING (
    participant_1_id = public.current_profile_id() OR
    participant_2_id = public.current_profile_id()
  );

-- Conversations: Users can insert if they're a participant
CREATE POLICY "conversations_insert_policy" ON conversations
  FOR INSERT WITH CHECK (
    participant_1_id = public.current_profile_id() OR
    participant_2_id = public.current_profile_id()
  );

-- Conversations: Users can update conversations they're part of
CREATE POLICY "conversations_update_policy" ON conversations
  FOR UPDATE USING (
    participant_1_id = public.current_profile_id() OR
    participant_2_id = public.current_profile_id()
  );

-- Messages: Users can see messages in their conversations
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = public.current_profile_id() OR
           c.participant_2_id = public.current_profile_id())
    )
  );

-- Messages: Users can insert messages in their conversations
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT WITH CHECK (
    sender_id = public.current_profile_id() AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = public.current_profile_id() OR
           c.participant_2_id = public.current_profile_id())
    )
  );

-- Messages: Users can update messages (mark as read)
CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = public.current_profile_id() OR
           c.participant_2_id = public.current_profile_id())
    )
  );

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION FOR CONVERSATION LOOKUP
-- ============================================================================

-- Function to get or create a conversation between two users
-- Always orders IDs so participant_1_id < participant_2_id
CREATE OR REPLACE FUNCTION get_or_create_conversation(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  p1 UUID;
  p2 UUID;
  conv_id UUID;
BEGIN
  -- Order the IDs canonically
  IF user_a < user_b THEN
    p1 := user_a;
    p2 := user_b;
  ELSE
    p1 := user_b;
    p2 := user_a;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conv_id
  FROM conversations
  WHERE participant_1_id = p1 AND participant_2_id = p2;

  -- Create if not exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations (participant_1_id, participant_2_id)
    VALUES (p1, p2)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: TRIGGER TO UPDATE CONVERSATION TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
