ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS batch_interval_sec integer NOT NULL DEFAULT 40;