-- Messaging Phase 5: Enable Realtime on messages table
-- This allows clients to subscribe to new message events for live updates

-- Enable realtime on messages table
-- Note: In Supabase, tables must be added to the 'supabase_realtime' publication
-- This enables real-time subscriptions for INSERT, UPDATE, and DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify with: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
