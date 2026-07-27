ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pizzaiolo_queue_position DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_pizzaiolo_queue_position
  ON public.orders (pizzaiolo_queue_position)
  WHERE status = 'to_prepare';

