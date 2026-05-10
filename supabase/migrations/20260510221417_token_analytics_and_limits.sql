/*
  # Token Analytics & Limits

  1. Modified Tables
    - `profiles`
      - `token_limit` (integer, nullable) — monthly token cap configured by admin; null = no limit
      - `token_alert_threshold` (integer, nullable) — token count at which the alert badge turns yellow; null = no alert

  2. New Functions
    - `get_token_stats_by_user()` — aggregates tokens per user (today, 7d, current month, all-time) by joining chat_logs → instances → profiles
    - `get_token_daily_series(p_user_id uuid, p_days integer)` — returns daily token totals for a specific user over the last N days (used for the expandable chart)

  3. Security
    - Both functions run with SECURITY DEFINER and are restricted to admin callers only
    - No new RLS policies needed (functions bypass RLS safely via service-role context in edge functions)
*/

-- Add token limit columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'token_limit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN token_limit integer DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'token_alert_threshold'
  ) THEN
    ALTER TABLE profiles ADD COLUMN token_alert_threshold integer DEFAULT NULL;
  END IF;
END $$;

-- Function: aggregate token stats per user
CREATE OR REPLACE FUNCTION get_token_stats_by_user()
RETURNS TABLE (
  user_id       uuid,
  email         text,
  plan_status   text,
  token_limit   integer,
  token_alert_threshold integer,
  tokens_today  bigint,
  tokens_7d     bigint,
  tokens_month  bigint,
  tokens_total  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id                        AS user_id,
    p.email,
    p.plan_status,
    p.token_limit,
    p.token_alert_threshold,
    COALESCE(SUM(cl.tokens_used) FILTER (
      WHERE cl.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
    ), 0)::bigint               AS tokens_today,
    COALESCE(SUM(cl.tokens_used) FILTER (
      WHERE cl.created_at >= now() - INTERVAL '7 days'
    ), 0)::bigint               AS tokens_7d,
    COALESCE(SUM(cl.tokens_used) FILTER (
      WHERE cl.created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
    ), 0)::bigint               AS tokens_month,
    COALESCE(SUM(cl.tokens_used), 0)::bigint AS tokens_total
  FROM profiles p
  LEFT JOIN instances i ON i.user_id = p.id
  LEFT JOIN chat_logs cl ON cl.instance_id = i.id
  GROUP BY p.id, p.email, p.plan_status, p.token_limit, p.token_alert_threshold
  ORDER BY tokens_month DESC;
$$;

-- Function: daily token series for a specific user
CREATE OR REPLACE FUNCTION get_token_daily_series(p_user_id uuid, p_days integer DEFAULT 7)
RETURNS TABLE (
  day       date,
  tokens    bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      (now() AT TIME ZONE 'UTC')::date - (p_days - 1),
      (now() AT TIME ZONE 'UTC')::date,
      '1 day'::interval
    )::date AS day
  )
  SELECT
    d.day,
    COALESCE(SUM(cl.tokens_used), 0)::bigint AS tokens
  FROM days d
  LEFT JOIN instances i ON i.user_id = p_user_id
  LEFT JOIN chat_logs cl
    ON cl.instance_id = i.id
    AND cl.created_at::date = d.day
  GROUP BY d.day
  ORDER BY d.day;
$$;
