CREATE TABLE public.lektionsplan (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fag_id uuid NOT NULL REFERENCES public.fag(id) ON DELETE CASCADE,
  raekkefolge integer NOT NULL,
  uge text,
  dato date,
  tidspunkt text,
  underviser text,
  titel text NOT NULL,
  type text,
  formaal text,
  pensum text,
  laeringsmaal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lektionsplan TO authenticated;
GRANT ALL ON public.lektionsplan TO service_role;
ALTER TABLE public.lektionsplan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese lektionsplan" ON public.lektionsplan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere lektionsplan" ON public.lektionsplan FOR ALL TO authenticated USING (true) WITH CHECK (true);
