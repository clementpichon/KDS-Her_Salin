ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS production_status TEXT NOT NULL DEFAULT 'to_prepare',
  ADD COLUMN IF NOT EXISTS oven_batch_id UUID,
  ADD COLUMN IF NOT EXISTS sent_to_oven_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_production_status_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_production_status_check
      CHECK (production_status IN ('to_prepare', 'in_oven', 'ready'));
  END IF;
END $$;

UPDATE public.order_items AS item
SET production_status = CASE
  WHEN orders.status IN ('ready', 'delivered') THEN 'ready'
  ELSE 'in_oven'
END
FROM public.orders AS orders
WHERE item.order_id = orders.id
  AND item.production_status = 'to_prepare'
  AND (
    item.prepared = true
    OR orders.status IN ('in_oven', 'ready', 'delivered')
  );

CREATE INDEX IF NOT EXISTS idx_order_items_production_status
  ON public.order_items (production_status);

CREATE INDEX IF NOT EXISTS idx_order_items_oven_batch
  ON public.order_items (oven_batch_id)
  WHERE oven_batch_id IS NOT NULL;
