CREATE TABLE public.ingredients (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON public.ingredients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);