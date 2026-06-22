ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone_hash TEXT;

ALTER TABLE public.phone_events
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS duration_sec INTEGER,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'phone_events_order_id_fkey'
  ) THEN
    ALTER TABLE public.phone_events
      ADD CONSTRAINT phone_events_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.phone_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_ringing BOOLEAN NOT NULL DEFAULT false,
  is_on_call BOOLEAN NOT NULL DEFAULT false,
  current_phone_number TEXT,
  device_id TEXT,
  call_started_at TIMESTAMPTZ,
  matched_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  matched_customer_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT phone_status_singleton CHECK (id = 1)
);

INSERT INTO public.phone_status (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone_hash ON public.orders(customer_phone_hash);
CREATE INDEX IF NOT EXISTS idx_phone_events_occurred_at ON public.phone_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_phone_events_device_id ON public.phone_events(device_id);
CREATE INDEX IF NOT EXISTS idx_phone_events_order_id ON public.phone_events(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_status TO anon, authenticated;
GRANT ALL ON public.phone_status TO service_role;

ALTER TABLE public.phone_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_all ON public.phone_status;
CREATE POLICY public_all ON public.phone_status FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_phone_status_updated'
  ) THEN
    CREATE TRIGGER trg_phone_status_updated
    BEFORE UPDATE ON public.phone_status
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'phone_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_status;
  END IF;
END $$;

ALTER TABLE public.phone_status REPLICA IDENTITY FULL;
