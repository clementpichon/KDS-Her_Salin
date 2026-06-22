ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS system_mode TEXT NOT NULL DEFAULT 'test'
  CHECK (system_mode IN ('test', 'learning', 'normal'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone_hash TEXT;

CREATE TABLE IF NOT EXISTS public.production_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  station TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id UUID,
  product_type TEXT,
  product_name TEXT,
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'learning', 'normal')),
  is_training_data BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_production_events_created_at ON public.production_events(created_at);
CREATE INDEX IF NOT EXISTS idx_production_events_order ON public.production_events(order_id);
CREATE INDEX IF NOT EXISTS idx_production_events_mode ON public.production_events(mode, is_training_data);
CREATE INDEX IF NOT EXISTS idx_production_events_station ON public.production_events(station);

CREATE TABLE IF NOT EXISTS public.phone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  phone_number_hash TEXT,
  call_duration_seconds INTEGER,
  call_id TEXT,
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'learning', 'normal')),
  is_training_data BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_phone_events_created_at ON public.phone_events(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_events_phone_hash ON public.phone_events(phone_number_hash);
CREATE INDEX IF NOT EXISTS idx_phone_events_call_id ON public.phone_events(call_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_events TO anon, authenticated;
GRANT ALL ON public.production_events TO service_role;
GRANT ALL ON public.phone_events TO service_role;

ALTER TABLE public.production_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_all ON public.production_events;
DROP POLICY IF EXISTS public_all ON public.phone_events;
CREATE POLICY public_all ON public.production_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY public_all ON public.phone_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.production_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_events;
ALTER TABLE public.production_events REPLICA IDENTITY FULL;
ALTER TABLE public.phone_events REPLICA IDENTITY FULL;
