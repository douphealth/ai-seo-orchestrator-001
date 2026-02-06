/*
  # Create Analysis History and Configuration Tables

  1. New Tables
    - `analysis_history`
      - `id` (uuid, primary key) - Unique analysis identifier
      - `user_id` (uuid) - References auth.users for ownership
      - `sitemap_url` (text) - The analyzed sitemap URL
      - `competitor_sitemaps` (jsonb) - Array of competitor URLs
      - `analysis_type` (text) - 'global' or 'local'
      - `target_location` (text) - Target location for local analysis
      - `sitewide_analysis` (jsonb) - Full sitewide audit data
      - `seo_analysis` (jsonb) - Page-level SEO analysis data
      - `sources` (jsonb) - Grounding sources from AI
      - `action_plan` (jsonb) - Generated daily action plans
      - `executive_summary` (jsonb) - Executive summary data
      - `created_at` (timestamptz) - When the analysis was created

    - `ai_configurations`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `provider` (text) - AI provider name
      - `api_key_hash` (text) - Hashed API key for identification (not the actual key)
      - `model` (text) - Selected model
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
    - Anonymous users can store data keyed by a session identifier
*/

CREATE TABLE IF NOT EXISTS analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  session_id text,
  sitemap_url text NOT NULL,
  competitor_sitemaps jsonb DEFAULT '[]'::jsonb,
  analysis_type text NOT NULL DEFAULT 'global',
  target_location text DEFAULT '',
  sitewide_analysis jsonb,
  seo_analysis jsonb,
  sources jsonb DEFAULT '[]'::jsonb,
  action_plan jsonb,
  executive_summary jsonb,
  display_date text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analysis history"
  ON analysis_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis history"
  ON analysis_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis history"
  ON analysis_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis history"
  ON analysis_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anon users can read by session_id"
  ON analysis_history
  FOR SELECT
  TO anon
  USING (session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id');

CREATE POLICY "Anon users can insert by session_id"
  ON analysis_history
  FOR INSERT
  TO anon
  WITH CHECK (session_id IS NOT NULL);

CREATE TABLE IF NOT EXISTS ai_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  session_id text,
  provider text NOT NULL,
  api_key_hash text NOT NULL DEFAULT '',
  model text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI config"
  ON ai_configurations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI config"
  ON ai_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI config"
  ON ai_configurations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI config"
  ON ai_configurations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_session_id ON analysis_history(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_user_id ON ai_configurations(user_id);
