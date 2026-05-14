/*
  # Typing simulation controls per instance

  Adds per-agent control over the "typing..." simulation that the webhook
  performs before sending each text fragment to WhatsApp.

  ## New columns on `instances`
    1. `typing_enabled` (bool, default true)
        - When false, the agent skips the "composing" presence and the
          artificial typing delay before sending fragments.
    2. `typing_speed_cps` (int, default 15)
        - Base typing speed in characters per second (5-30 sane range).
    3. `typing_min_ms` (int, default 1500)
        - Lower bound for the simulated typing time per fragment.
    4. `typing_max_ms` (int, default 18000)
        - Upper bound for the simulated typing time per fragment.
    5. `typing_variability` (int, default 50)
        - 0-100. Higher means more random hesitations and speed jitter.
    6. `first_reply_delay_ms` (int, default 0)
        - Extra delay applied once before the first fragment of a reply,
          to simulate "reading then thinking".

  ## Notes
    All defaults are tuned to match the current hard-coded behaviour, so
    existing agents keep behaving exactly the same until customised.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='instances' AND column_name='typing_enabled') THEN
    ALTER TABLE instances ADD COLUMN typing_enabled boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='instances' AND column_name='typing_speed_cps') THEN
    ALTER TABLE instances ADD COLUMN typing_speed_cps integer NOT NULL DEFAULT 15;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='instances' AND column_name='typing_min_ms') THEN
    ALTER TABLE instances ADD COLUMN typing_min_ms integer NOT NULL DEFAULT 1500;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='instances' AND column_name='typing_max_ms') THEN
    ALTER TABLE instances ADD COLUMN typing_max_ms integer NOT NULL DEFAULT 18000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='instances' AND column_name='typing_variability') THEN
    ALTER TABLE instances ADD COLUMN typing_variability integer NOT NULL DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='instances' AND column_name='first_reply_delay_ms') THEN
    ALTER TABLE instances ADD COLUMN first_reply_delay_ms integer NOT NULL DEFAULT 0;
  END IF;
END $$;
