CREATE TABLE public.eksamen (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fag_id uuid NOT NULL REFERENCES public.fag(id) ON DELETE CASCADE,
  navn text,
  dato date,
  vaegt numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eksamen TO authenticated;
GRANT ALL ON public.eksamen TO service_role;
ALTER TABLE public.eksamen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese eksamen" ON public.eksamen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere eksamen" ON public.eksamen FOR ALL TO authenticated USING (true) WITH CHECK (true);
