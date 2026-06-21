ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pains_panino_status TEXT;
-- values: NULL = aucun pain à préparer, 'a_preparer', 'en_cours', 'pret'