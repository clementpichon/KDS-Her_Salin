ALTER TABLE public.pizzas
  ADD COLUMN IF NOT EXISTS default_base TEXT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS default_base_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS explicit_base_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS base_resolution TEXT,
  ADD COLUMN IF NOT EXISTS base_confidence NUMERIC(4, 3);

UPDATE public.pizzas
SET default_base = CASE
  WHEN lower(array_to_string(ingredients, ' ')) LIKE '%truff%' THEN 'truffle_cream'
  WHEN lower(array_to_string(ingredients, ' ')) LIKE '%chèvre%'
    OR lower(array_to_string(ingredients, ' ')) LIKE '%chevre%' THEN 'goat_cream'
  WHEN lower(array_to_string(ingredients, ' ')) LIKE '%crème%'
    OR lower(array_to_string(ingredients, ' ')) LIKE '%creme%' THEN 'cream'
  WHEN lower(array_to_string(ingredients, ' ')) LIKE '%tomate%' THEN 'tomato'
  ELSE 'unknown'
END
WHERE default_base IS NULL;

UPDATE public.order_items
SET base = CASE
  WHEN lower(base) IN ('tomato', 'tomate', 'sauce tomate') THEN 'tomato'
  WHEN lower(base) IN ('cream', 'creme', 'crème', 'crème fraîche', 'creme fraiche') THEN 'cream'
  WHEN lower(base) IN ('goat_cream', 'crème de chèvre', 'creme de chevre', 'chevre', 'chèvre') THEN 'goat_cream'
  WHEN lower(base) IN ('truffle_cream', 'crème de truffe', 'crème de truffes', 'creme de truffe', 'creme de truffes', 'truffe') THEN 'truffle_cream'
  WHEN lower(base) IN ('none', 'sans base') THEN 'none'
  ELSE base
END
WHERE base IS NOT NULL;

UPDATE public.order_items oi
SET default_base_snapshot = p.default_base
FROM public.pizzas p
WHERE oi.pizza_id = p.id
  AND oi.default_base_snapshot IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pizzas_default_base_check'
  ) THEN
    ALTER TABLE public.pizzas
      ADD CONSTRAINT pizzas_default_base_check
      CHECK (default_base IS NULL OR default_base IN ('tomato', 'cream', 'goat_cream', 'truffle_cream', 'none', 'unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_base_resolution_check'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_base_resolution_check
      CHECK (
        base_resolution IS NULL OR base_resolution IN (
          'default',
          'explicit',
          'inferred_replacement',
          'removed_without_replacement',
          'default_with_extra_base_ingredient',
          'ambiguous',
          'unknown'
        )
      );
  END IF;
END $$;
