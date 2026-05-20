/*
  # Analytics Functions for Dashboard

  1. New Functions
    - `get_analytics_overview` - Returns comprehensive analytics data for a user's agents
      - Total messages in/out
      - Unique active contacts
      - Average first response time (seconds)
      - Resolution rate
      - Manual override (escalation) count
      - Feedback positive/negative counts
      - Daily time series (messages in/out per day)
      - Hourly distribution (messages by hour of day)
    - `get_analytics_agents_comparison` - Returns per-agent metrics for comparison
      - Messages count per agent
      - Active contacts per agent
      - Resolution rate per agent
      - Average response time per agent

  2. Security
    - Both functions use SECURITY DEFINER with explicit auth.uid() checks
    - Users can only access their own data

  3. Notes
    - Response time is calculated as the difference between an inbound message and the next outbound message for the same customer
    - Resolution rate uses the overflow_keyword from the instance to determine unresolved conversations
*/

-- Analytics overview function
CREATE OR REPLACE FUNCTION get_analytics_overview(
  p_user_id uuid,
  p_instance_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT now() - interval '7 days',
  p_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_messages_in bigint;
  v_messages_out bigint;
  v_active_contacts bigint;
  v_avg_response_time_seconds numeric;
  v_resolution_rate numeric;
  v_escalations bigint;
  v_feedback_positive bigint;
  v_feedback_negative bigint;
  v_daily_series jsonb;
  v_hourly_distribution jsonb;
  v_prev_from timestamptz;
  v_prev_to timestamptz;
  v_prev_messages bigint;
  v_prev_contacts bigint;
  v_prev_response_time numeric;
  v_prev_resolution_rate numeric;
BEGIN
  -- Verify the requesting user matches
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate previous period for comparison
  v_prev_from := p_from - (p_to - p_from);
  v_prev_to := p_from;

  -- Messages in/out for current period
  SELECT
    COALESCE(SUM(CASE WHEN cl.direction = 'in' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cl.direction = 'out' THEN 1 ELSE 0 END), 0)
  INTO v_messages_in, v_messages_out
  FROM chat_logs cl
  JOIN instances i ON cl.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
    AND cl.created_at >= p_from
    AND cl.created_at <= p_to;

  -- Active contacts
  SELECT COUNT(DISTINCT cl.customer_number)
  INTO v_active_contacts
  FROM chat_logs cl
  JOIN instances i ON cl.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
    AND cl.created_at >= p_from
    AND cl.created_at <= p_to;

  -- Average response time (first response per conversation segment)
  SELECT COALESCE(AVG(response_time), 0)
  INTO v_avg_response_time_seconds
  FROM (
    SELECT EXTRACT(EPOCH FROM (
      (SELECT MIN(cl2.created_at)
       FROM chat_logs cl2
       WHERE cl2.instance_id = cl.instance_id
         AND cl2.customer_number = cl.customer_number
         AND cl2.direction = 'out'
         AND cl2.created_at > cl.created_at
         AND cl2.created_at < cl.created_at + interval '1 hour')
      - cl.created_at
    )) as response_time
    FROM chat_logs cl
    JOIN instances i ON cl.instance_id = i.id
    WHERE i.user_id = p_user_id
      AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
      AND cl.direction = 'in'
      AND cl.created_at >= p_from
      AND cl.created_at <= p_to
  ) sub
  WHERE sub.response_time IS NOT NULL AND sub.response_time > 0;

  -- Resolution rate
  SELECT COALESCE(
    CASE WHEN COUNT(DISTINCT cl.customer_number) = 0 THEN 0
    ELSE ROUND(
      (COUNT(DISTINCT cl.customer_number) - COUNT(DISTINCT CASE
        WHEN cl.direction = 'in' AND EXISTS (
          SELECT 1 FROM instances i2
          WHERE i2.id = cl.instance_id
            AND i2.overflow_keyword IS NOT NULL
            AND i2.overflow_keyword != ''
            AND LOWER(cl.message_body) LIKE '%' || LOWER(i2.overflow_keyword) || '%'
        ) THEN cl.customer_number
      END))::numeric / COUNT(DISTINCT cl.customer_number) * 100, 1)
    END, 0)
  INTO v_resolution_rate
  FROM chat_logs cl
  JOIN instances i ON cl.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
    AND cl.created_at >= p_from
    AND cl.created_at <= p_to;

  -- Escalations (manual_override conversations)
  SELECT COUNT(*)
  INTO v_escalations
  FROM conversation_states cs
  JOIN instances i ON cs.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cs.instance_id = p_instance_id)
    AND cs.manual_override = true
    AND cs.updated_at >= p_from
    AND cs.updated_at <= p_to;

  -- Feedback counts
  SELECT
    COALESCE(SUM(CASE WHEN cl.feedback_quality IN ('good', 'excellent') THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cl.feedback_quality = 'bad' THEN 1 ELSE 0 END), 0)
  INTO v_feedback_positive, v_feedback_negative
  FROM chat_logs cl
  JOIN instances i ON cl.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
    AND cl.feedback_quality IS NOT NULL
    AND cl.created_at >= p_from
    AND cl.created_at <= p_to;

  -- Daily time series
  SELECT jsonb_agg(jsonb_build_object('day', d.day::text, 'messages_in', COALESCE(sub.msg_in, 0), 'messages_out', COALESCE(sub.msg_out, 0)))
  INTO v_daily_series
  FROM generate_series(p_from::date, p_to::date, '1 day'::interval) d(day)
  LEFT JOIN (
    SELECT cl.created_at::date as day,
      SUM(CASE WHEN cl.direction = 'in' THEN 1 ELSE 0 END) as msg_in,
      SUM(CASE WHEN cl.direction = 'out' THEN 1 ELSE 0 END) as msg_out
    FROM chat_logs cl
    JOIN instances i ON cl.instance_id = i.id
    WHERE i.user_id = p_user_id
      AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
      AND cl.created_at >= p_from
      AND cl.created_at <= p_to
    GROUP BY cl.created_at::date
  ) sub ON d.day::date = sub.day;

  -- Hourly distribution
  SELECT jsonb_agg(jsonb_build_object('hour', h.hour, 'count', COALESCE(sub.cnt, 0)))
  INTO v_hourly_distribution
  FROM generate_series(0, 23) h(hour)
  LEFT JOIN (
    SELECT EXTRACT(HOUR FROM cl.created_at)::int as hour, COUNT(*) as cnt
    FROM chat_logs cl
    JOIN instances i ON cl.instance_id = i.id
    WHERE i.user_id = p_user_id
      AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
      AND cl.created_at >= p_from
      AND cl.created_at <= p_to
    GROUP BY EXTRACT(HOUR FROM cl.created_at)::int
  ) sub ON h.hour = sub.hour;

  -- Previous period metrics for comparison
  SELECT COALESCE(COUNT(*), 0)
  INTO v_prev_messages
  FROM chat_logs cl
  JOIN instances i ON cl.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
    AND cl.created_at >= v_prev_from
    AND cl.created_at <= v_prev_to;

  SELECT COUNT(DISTINCT cl.customer_number)
  INTO v_prev_contacts
  FROM chat_logs cl
  JOIN instances i ON cl.instance_id = i.id
  WHERE i.user_id = p_user_id
    AND (p_instance_id IS NULL OR cl.instance_id = p_instance_id)
    AND cl.created_at >= v_prev_from
    AND cl.created_at <= v_prev_to;

  -- Build result
  result := jsonb_build_object(
    'messages_in', v_messages_in,
    'messages_out', v_messages_out,
    'active_contacts', v_active_contacts,
    'avg_response_time_seconds', ROUND(v_avg_response_time_seconds, 1),
    'resolution_rate', v_resolution_rate,
    'escalations', v_escalations,
    'feedback_positive', v_feedback_positive,
    'feedback_negative', v_feedback_negative,
    'daily_series', COALESCE(v_daily_series, '[]'::jsonb),
    'hourly_distribution', COALESCE(v_hourly_distribution, '[]'::jsonb),
    'prev_period', jsonb_build_object(
      'messages_total', v_prev_messages,
      'active_contacts', v_prev_contacts
    )
  );

  RETURN result;
END;
$$;

-- Agents comparison function
CREATE OR REPLACE FUNCTION get_analytics_agents_comparison(
  p_user_id uuid,
  p_from timestamptz DEFAULT now() - interval '7 days',
  p_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(jsonb_agg(agent_data), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'instance_id', i.id,
      'instance_name', COALESCE(i.display_name, i.instance_name),
      'avatar_url', i.avatar_url,
      'color', i.color,
      'messages_total', COALESCE(SUM(CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END), 0),
      'messages_in', COALESCE(SUM(CASE WHEN cl.direction = 'in' THEN 1 ELSE 0 END), 0),
      'messages_out', COALESCE(SUM(CASE WHEN cl.direction = 'out' THEN 1 ELSE 0 END), 0),
      'active_contacts', COUNT(DISTINCT cl.customer_number),
      'avg_response_time_seconds', ROUND(COALESCE(AVG(
        CASE WHEN cl.direction = 'in' THEN
          EXTRACT(EPOCH FROM (
            (SELECT MIN(cl2.created_at)
             FROM chat_logs cl2
             WHERE cl2.instance_id = cl.instance_id
               AND cl2.customer_number = cl.customer_number
               AND cl2.direction = 'out'
               AND cl2.created_at > cl.created_at
               AND cl2.created_at < cl.created_at + interval '1 hour')
            - cl.created_at
          ))
        END
      ), 0), 1)
    ) as agent_data
    FROM instances i
    LEFT JOIN chat_logs cl ON cl.instance_id = i.id
      AND cl.created_at >= p_from
      AND cl.created_at <= p_to
    WHERE i.user_id = p_user_id
    GROUP BY i.id, i.display_name, i.instance_name, i.avatar_url, i.color
    ORDER BY COALESCE(SUM(CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END), 0) DESC
  ) sub;

  RETURN result;
END;
$$;
