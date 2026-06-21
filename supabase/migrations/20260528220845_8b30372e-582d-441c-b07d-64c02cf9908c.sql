
-- Status enum
CREATE TYPE public.order_status AS ENUM ('to_prepare', 'in_oven', 'ready', 'delivered');

-- Settings singleton
CREATE TABLE public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  oven_capacity INTEGER NOT NULL DEFAULT 4,
  cook_time_sec INTEGER NOT NULL DEFAULT 90,
  prep_time_per_pizza_sec INTEGER NOT NULL DEFAULT 120,
  boxing_time_sec INTEGER NOT NULL DEFAULT 180,
  safety_margin_sec INTEGER NOT NULL DEFAULT 120,
  initial_paton_stock INTEGER NOT NULL DEFAULT 120,
  paton_losses INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.settings (id) VALUES (1);

-- Pizza catalog
CREATE TABLE public.pizzas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  requested_time TIMESTAMPTZ NOT NULL,
  status public.order_status NOT NULL DEFAULT 'to_prepare',
  prep_start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_prep_start ON public.orders(prep_start_time);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  pizza_id UUID REFERENCES public.pizzas(id),
  pizza_name TEXT NOT NULL,
  extras TEXT[] NOT NULL DEFAULT '{}',
  removed TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Grants (V1: accès libre, lecture/écriture publique)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pizzas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
GRANT ALL ON public.pizzas TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

-- RLS : tout autorisé (V1 sans auth, outil interne)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.pizzas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.settings REPLICA IDENTITY FULL;

-- Seed pizzas
INSERT INTO public.pizzas (name, image_path, sort_order, ingredients) VALUES
('Marguerita', 'marguerita.jpg', 1, ARRAY['Sauce tomate','Basilic','Mozzarella Fior di Latte']),
('Régina', 'regina.jpg', 2, ARRAY['Sauce tomate','Champignons de Paris','Jambon cuit aux herbes','Mozzarella Fior di Latte']),
('Piccante', 'piccante.jpg', 3, ARRAY['Sauce tomate','Spianata piccante','Mozzarella Fior di Latte','Olives noires']),
('Fromages', 'fromages.jpg', 4, ARRAY['Crème de chèvre','Gorgonzola','Mozzarella Fior di Latte','Parmigiano']),
('Truffe Parme', 'truffe-parme.jpg', 5, ARRAY['Crème de truffes','Mozzarella Fior di Latte','Jambon de Parme','Stracciatella']),
('Napolitaine', 'napolitaine.jpg', 6, ARRAY['Sauce tomate','Anchois marinés','Câpres','Mozzarella Fior di Latte','Olives noires','Origan']),
('Chèvre Miel', 'chevre-miel.jpg', 7, ARRAY['Crème de chèvre','Mozzarella Fior di Latte','Miel']),
('Carbonara', 'carbonara.jpg', 8, ARRAY['Crème fraîche','Lardons','Œufs','Mozzarella Fior di Latte','Parmesan']),
('Saumon', 'saumon.jpg', 9, ARRAY['Crème salicorne','Saumon fumé','Mozzarella Fior di Latte']),
('Calzon', 'calzon.jpg', 10, ARRAY['Sauce tomate','Jambon cuit aux herbes','Champignons de Paris','Mozzarella Fior di Latte','Œuf']),
('Savoyarde', 'savoyarde.jpg', 11, ARRAY['Crème fraîche','Lardons','Pommes de terre','Oignons rouges','Reblochon','Mozzarella Fior di Latte']),
('Végétarienne', 'vegetarienne.jpg', 12, ARRAY['Sauce tomate','Champignons de Paris','Oignons rouges','Roquette','Olives noires','Basilic']);
