
-- Enum for Pani'NO item status
CREATE TYPE public.panino_item_status AS ENUM ('pending', 'in_progress', 'done');

-- Catalog of Pani'NO products
CREATE TABLE public.panino_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panino_products TO anon, authenticated;
GRANT ALL ON public.panino_products TO service_role;

ALTER TABLE public.panino_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON public.panino_products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Generic options for a product (bases, fries modes, sides, sauces, removables, extras)
CREATE TABLE public.panino_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL,
  kind text NOT NULL,
  name text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  multi boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_panino_options_lookup ON public.panino_options(product_key, kind, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panino_options TO anon, authenticated;
GRANT ALL ON public.panino_options TO service_role;

ALTER TABLE public.panino_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON public.panino_options FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Pani'NO order items (separate from pizza order_items, routed to Pani'NO KDS)
CREATE TABLE public.panino_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_key text NOT NULL,
  product_name text NOT NULL,
  base text,
  fries_mode text,
  side text,
  sauces text[] NOT NULL DEFAULT '{}',
  removed text[] NOT NULL DEFAULT '{}',
  extras text[] NOT NULL DEFAULT '{}',
  status public.panino_item_status NOT NULL DEFAULT 'pending',
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_panino_order_items_order ON public.panino_order_items(order_id);
CREATE INDEX idx_panino_order_items_status ON public.panino_order_items(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panino_order_items TO anon, authenticated;
GRANT ALL ON public.panino_order_items TO service_role;

ALTER TABLE public.panino_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON public.panino_order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.panino_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.panino_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.panino_options;

-- Seed products
INSERT INTO public.panino_products (key, name, sort_order) VALUES
  ('panino', 'Pani''NO', 1),
  ('fishno', 'Fish & NO', 2),
  ('cornet_frites', 'Cornet de frites', 3);

-- Seed options for Pani'NO
INSERT INTO public.panino_options (product_key, kind, name, required, multi, sort_order) VALUES
  ('panino', 'base', 'Crème', true, false, 1),
  ('panino', 'base', 'Tomate', true, false, 2),
  ('panino', 'fries_mode', 'Dans le Pani''NO', true, false, 1),
  ('panino', 'fries_mode', 'Cornet séparé', true, false, 2),
  ('panino', 'sauce', 'Sauce blanche', false, true, 1),
  ('panino', 'sauce', 'Andalouse', false, true, 2),
  ('panino', 'sauce', 'Samouraï', false, true, 3),
  ('panino', 'sauce', 'Burger', false, true, 4),
  ('panino', 'sauce', 'Algérienne', false, true, 5),
  ('panino', 'sauce', 'Barbecue', false, true, 6),
  ('panino', 'sauce', 'Moutarde', false, true, 7),
  ('panino', 'sauce', 'Ketchup', false, true, 8),
  ('panino', 'sauce', 'Mayonnaise', false, true, 9),
  ('panino', 'removable', 'Tomates', false, true, 1),
  ('panino', 'removable', 'Oignons rouges', false, true, 2),
  ('panino', 'removable', 'Roquette', false, true, 3),
  ('panino', 'removable', 'Cheddar', false, true, 4),
  ('panino', 'removable', 'Sauce', false, true, 5),
  ('panino', 'extra', 'Double steak', false, true, 1),
  ('panino', 'extra', 'Double cheddar', false, true, 2),
  ('panino', 'extra', 'Bacon', false, true, 3),
  ('panino', 'extra', 'Œuf', false, true, 4),
  ('panino', 'extra', 'Fromage supplémentaire', false, true, 5),
  ('panino', 'extra', 'Sauce supplémentaire', false, true, 6);

-- Seed options for Fish & NO
INSERT INTO public.panino_options (product_key, kind, name, required, multi, sort_order) VALUES
  ('fishno', 'side', 'Frites', true, false, 1),
  ('fishno', 'side', 'Pommes grenailles', true, false, 2),
  ('fishno', 'removable', 'Sauce tartare', false, true, 1),
  ('fishno', 'extra', 'Cornet de frites supplémentaire', false, true, 1),
  ('fishno', 'extra', 'Portion de pommes grenailles supplémentaire', false, true, 2),
  ('fishno', 'extra', 'Sauce supplémentaire', false, true, 3);
