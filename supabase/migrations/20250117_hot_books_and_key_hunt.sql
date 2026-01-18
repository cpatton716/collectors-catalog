-- =============================================
-- Hot Books Caching & Key Hunt Wishlist
-- =============================================

-- =============================================
-- 1. Hot Books Table - Cached trending comics
-- =============================================
CREATE TABLE IF NOT EXISTS hot_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Book identification
  title text NOT NULL,
  title_normalized text NOT NULL,
  issue_number text NOT NULL,
  publisher text,
  release_year text,

  -- Key information (stored once, rarely changes)
  key_info text[] DEFAULT '{}',
  why_hot text,
  creators jsonb DEFAULT '{}',  -- {writer, artist, coverArtist}

  -- Cover image (stored once)
  cover_image_url text,

  -- Pricing (refreshed daily)
  price_low numeric,
  price_mid numeric,
  price_high numeric,
  price_source text DEFAULT 'ebay',  -- 'ebay', 'gocollect', 'ai_estimate'
  prices_updated_at timestamptz,

  -- Ranking (refreshed daily)
  current_rank integer,
  previous_rank integer,
  rank_change integer GENERATED ALWAYS AS (
    CASE
      WHEN previous_rank IS NULL THEN NULL
      ELSE previous_rank - current_rank
    END
  ) STORED,

  -- Hot metrics
  price_velocity numeric,  -- % change in price
  sales_volume integer,    -- Number of recent sales
  media_score integer,     -- 1-10 media hype score

  -- Data source tracking
  data_source text DEFAULT 'ai',  -- 'gocollect', 'ai', 'manual'

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata_updated_at timestamptz,  -- When non-price data was last updated

  -- Prevent duplicates
  UNIQUE (title_normalized, issue_number)
);

-- Indexes for hot_books
CREATE INDEX IF NOT EXISTS idx_hot_books_rank ON hot_books(current_rank) WHERE current_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hot_books_title ON hot_books(title_normalized);
CREATE INDEX IF NOT EXISTS idx_hot_books_updated ON hot_books(prices_updated_at);

-- RLS for hot_books (public read, service role write)
ALTER TABLE hot_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hot_books" ON hot_books
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage hot_books" ON hot_books
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 2. Hot Books History - Track ranking changes
-- =============================================
CREATE TABLE IF NOT EXISTS hot_books_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hot_book_id uuid NOT NULL REFERENCES hot_books(id) ON DELETE CASCADE,

  rank integer NOT NULL,
  price_low numeric,
  price_mid numeric,
  price_high numeric,

  recorded_at date NOT NULL DEFAULT CURRENT_DATE,

  -- One record per book per day
  UNIQUE (hot_book_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_hot_books_history_book ON hot_books_history(hot_book_id);
CREATE INDEX IF NOT EXISTS idx_hot_books_history_date ON hot_books_history(recorded_at);

-- RLS for hot_books_history
ALTER TABLE hot_books_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hot_books_history" ON hot_books_history
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage hot_books_history" ON hot_books_history
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 3. Key Hunt Lists - User wishlists
-- =============================================
CREATE TABLE IF NOT EXISTS key_hunt_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,  -- Clerk user ID

  -- Book details (denormalized for performance)
  title text NOT NULL,
  title_normalized text NOT NULL,
  issue_number text NOT NULL,
  publisher text,
  release_year text,
  cover_image_url text,

  -- Key info at time of addition
  key_info text[] DEFAULT '{}',

  -- Target pricing (what user wants to pay)
  target_price_low numeric,
  target_price_high numeric,

  -- Current market price (refreshed periodically)
  current_price_low numeric,
  current_price_mid numeric,
  current_price_high numeric,
  prices_updated_at timestamptz,

  -- User notes
  notes text,
  priority integer DEFAULT 5,  -- 1-10, higher = more wanted

  -- Source tracking
  added_from text,  -- 'hot_books', 'scan', 'key_hunt', 'manual'

  -- Notifications
  notify_price_drop boolean DEFAULT false,
  notify_threshold numeric,  -- Alert when price drops below this

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One entry per user per book
  UNIQUE (user_id, title_normalized, issue_number)
);

-- Indexes for key_hunt_lists
CREATE INDEX IF NOT EXISTS idx_key_hunt_user ON key_hunt_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_key_hunt_title ON key_hunt_lists(title_normalized);
CREATE INDEX IF NOT EXISTS idx_key_hunt_priority ON key_hunt_lists(user_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_key_hunt_notify ON key_hunt_lists(notify_price_drop) WHERE notify_price_drop = true;

-- RLS for key_hunt_lists
ALTER TABLE key_hunt_lists ENABLE ROW LEVEL SECURITY;

-- Users can only see their own lists
CREATE POLICY "Users can view own key_hunt_lists" ON key_hunt_lists
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own key_hunt_lists" ON key_hunt_lists
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own key_hunt_lists" ON key_hunt_lists
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own key_hunt_lists" ON key_hunt_lists
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Service role full access to key_hunt_lists" ON key_hunt_lists
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 4. Hot Books Refresh Log - Track API calls
-- =============================================
CREATE TABLE IF NOT EXISTS hot_books_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  refresh_type text NOT NULL,  -- 'full_list', 'prices_only', 'single_book'
  data_source text NOT NULL,   -- 'gocollect', 'ai', 'ebay'

  books_updated integer DEFAULT 0,
  success boolean DEFAULT true,
  error_message text,

  api_calls_used integer DEFAULT 1,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_log_date ON hot_books_refresh_log(created_at);

-- RLS for refresh log
ALTER TABLE hot_books_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access to refresh_log" ON hot_books_refresh_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 5. Helper Functions
-- =============================================

-- Normalize title for matching
CREATE OR REPLACE FUNCTION normalize_hot_book_title(title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hot_books_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hot_books_updated_at
  BEFORE UPDATE ON hot_books
  FOR EACH ROW
  EXECUTE FUNCTION update_hot_books_timestamp();

CREATE TRIGGER key_hunt_updated_at
  BEFORE UPDATE ON key_hunt_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_hot_books_timestamp();

-- =============================================
-- 6. Seed initial hot books from static list
-- =============================================
INSERT INTO hot_books (
  title, title_normalized, issue_number, publisher, release_year,
  key_info, why_hot, cover_image_url,
  price_low, price_mid, price_high, price_source,
  current_rank, data_source, prices_updated_at, metadata_updated_at
) VALUES
  ('Fantastic Four', 'fantastic four', '5', 'Marvel Comics', '1962',
   ARRAY['First appearance of Doctor Doom', 'Second appearance of Fantastic Four'],
   'Doctor Doom''s upcoming MCU debut and consistent collector demand for this classic villain key',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/10/108995/3593371-ff%20005_cf_bk_hk.jpg',
   1200, 2500, 5000, 'ai_estimate', 1, 'static', now(), now()),

  ('X-Men', 'xmen', '4', 'Marvel Comics', '1964',
   ARRAY['First appearance of Scarlet Witch and Quicksilver', 'First appearance of Brotherhood of Evil Mutants'],
   'Speculation around X-Men MCU integration and Scarlet Witch''s continued popularity',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/0/5344/1356279-01.jpg',
   800, 1500, 3000, 'ai_estimate', 2, 'static', now(), now()),

  ('Ultimate Fallout', 'ultimate fallout', '4', 'Marvel Comics', '2011',
   ARRAY['First appearance of Miles Morales as Spider-Man'],
   'Miles Morales live-action movie rumors and Spider-Verse popularity',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/6/67663/1966577-04a.jpg',
   150, 300, 600, 'ai_estimate', 3, 'static', now(), now()),

  ('Ms. Marvel', 'ms marvel', '1', 'Marvel Comics', '2014',
   ARRAY['First appearance of Kamala Khan as Ms. Marvel'],
   'Disney+ series success and upcoming movie featuring the character',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/15354-2910-17111-1-ms-marvel.jpg',
   80, 150, 300, 'ai_estimate', 4, 'static', now(), now()),

  ('New Mutants', 'new mutants', '98', 'Marvel Comics', '1991',
   ARRAY['First appearance of Deadpool', 'First appearance of Domino'],
   'Deadpool 3 confirmed for MCU with Ryan Reynolds returning',
   NULL, 400, 700, 1200, 'ai_estimate', 5, 'static', now(), now()),

  ('Iron Man', 'iron man', '55', 'Marvel Comics', '1973',
   ARRAY['First appearance of Thanos', 'First appearance of Drax the Destroyer'],
   'Thanos remains popular post-Endgame, speculation about cosmic MCU future',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/11/117763/2844051-ironman055.jpg',
   600, 1000, 1800, 'ai_estimate', 6, 'static', now(), now()),

  ('Teenage Mutant Ninja Turtles', 'teenage mutant ninja turtles', '1', 'Mirage Studios', '1984',
   ARRAY['First appearance of TMNT', 'Origin story of the Teenage Mutant Ninja Turtles'],
   'New TMNT movie announcements and 40th anniversary approaching',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/71033-11889-104031-1-teenage-mutant-ninja.jpg',
   1500, 3000, 6000, 'ai_estimate', 7, 'static', now(), now()),

  ('Wolverine', 'wolverine', '1', 'Marvel Comics', '1982',
   ARRAY['First solo Wolverine limited series', 'Key Wolverine collectible'],
   'Hugh Jackman returning as Wolverine in Deadpool 3, renewed interest in character',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/11161/111615891/9300027-3983472080-30841.jpg',
   60, 120, 250, 'ai_estimate', 8, 'static', now(), now()),

  ('Saga', 'saga', '1', 'Image Comics', '2012',
   ARRAY['First issue of acclaimed series by Brian K. Vaughan and Fiona Staples'],
   'Series return from hiatus and continued speculation about TV/movie adaptation',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/62641-3239-95637-1-saga-of-crystar-cry.jpg',
   100, 200, 400, 'ai_estimate', 9, 'static', now(), now()),

  ('Captain Marvel', 'captain marvel', '1', 'Marvel Comics', '1968',
   ARRAY['First appearance of Mar-Vell Captain Marvel', 'First Silver Age Captain Marvel'],
   'The Marvels movie release and cosmic MCU expansion driving interest',
   'https://comicvine.gamespot.com/a/uploads/scale_medium/0/4/7691-2326-8486-1-captain-marvel.jpg',
   200, 400, 800, 'ai_estimate', 10, 'static', now(), now())
ON CONFLICT (title_normalized, issue_number) DO NOTHING;
