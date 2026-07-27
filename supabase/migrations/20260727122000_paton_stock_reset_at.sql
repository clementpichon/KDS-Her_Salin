ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS paton_stock_reset_at TIMESTAMPTZ;
