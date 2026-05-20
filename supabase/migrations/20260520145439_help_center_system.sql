/*
  # Help Center System

  Complete help center / documentation system for user self-service.

  1. New Tables
    - `help_categories`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `slug` (text, unique, not null)
      - `description` (text)
      - `icon_name` (text) - lucide icon name
      - `sort_order` (int, default 0)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `help_articles`
      - `id` (uuid, primary key)
      - `category_id` (uuid, FK -> help_categories)
      - `title` (text, not null)
      - `slug` (text, unique, not null)
      - `summary` (text)
      - `content` (text) - Markdown content
      - `video_url` (text, nullable) - YouTube/Vimeo embed URL
      - `cover_image_url` (text, nullable)
      - `sort_order` (int, default 0)
      - `is_featured` (boolean, default false)
      - `is_active` (boolean, default true)
      - `views_count` (int, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `help_article_reactions`
      - `id` (uuid, primary key)
      - `article_id` (uuid, FK -> help_articles)
      - `user_id` (uuid, FK -> profiles)
      - `reaction` (text) - 'helpful' or 'not_helpful'
      - `created_at` (timestamptz)
      - Unique constraint on (article_id, user_id)

  2. Security
    - RLS enabled on all tables
    - Authenticated users can read active categories and articles
    - Authenticated users can insert/update their own reactions
    - Admin users (role = 'admin') have full CRUD access

  3. Functions
    - `increment_article_views` - atomically increment view count
*/

-- help_categories table
CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon_name text DEFAULT 'folder',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

-- help_articles table
CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  summary text DEFAULT '',
  content text DEFAULT '',
  video_url text,
  cover_image_url text,
  sort_order int DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- help_article_reactions table
CREATE TABLE IF NOT EXISTS help_article_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, user_id)
);

ALTER TABLE help_article_reactions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_category_id ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_is_active ON help_articles(is_active);
CREATE INDEX IF NOT EXISTS idx_help_articles_is_featured ON help_articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_help_article_reactions_article_id ON help_article_reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_help_article_reactions_user_id ON help_article_reactions(user_id);

-- RLS Policies for help_categories

CREATE POLICY "Authenticated users can read active categories"
  ON help_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert categories"
  ON help_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update categories"
  ON help_categories FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete categories"
  ON help_categories FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin also needs to read inactive categories
CREATE POLICY "Admins can read all categories"
  ON help_categories FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for help_articles

CREATE POLICY "Authenticated users can read active articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert articles"
  ON help_articles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update articles"
  ON help_articles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete articles"
  ON help_articles FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can read all articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for help_article_reactions

CREATE POLICY "Users can read their own reactions"
  ON help_article_reactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reaction"
  ON help_article_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reaction"
  ON help_article_reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reaction"
  ON help_article_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all reactions"
  ON help_article_reactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Function to atomically increment article views
CREATE OR REPLACE FUNCTION increment_article_views(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE help_articles
  SET views_count = views_count + 1
  WHERE id = article_id AND is_active = true;
END;
$$;
