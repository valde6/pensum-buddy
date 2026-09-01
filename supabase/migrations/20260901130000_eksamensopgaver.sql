CREATE TABLE public.eksamensopgave (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eksamen_id uuid NOT NULL REFERENCES public.eksamen(id) ON DELETE CASCADE,
  titel text NOT NULL,
  periode text,
  proeveform text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eksamensopgave TO authenticated;
GRANT ALL ON public.eksamensopgave TO service_role;
ALTER TABLE public.eksamensopgave ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese eksamensopgave" ON public.eksamensopgave FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere eksamensopgave" ON public.eksamensopgave FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.eksamensopgave_del (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eksamensopgave_id uuid NOT NULL REFERENCES public.eksamensopgave(id) ON DELETE CASCADE,
  nummer integer NOT NULL,
  vaegt numeric,
  emne text NOT NULL,
  beskrivelse text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eksamensopgave_del TO authenticated;
GRANT ALL ON public.eksamensopgave_del TO service_role;
ALTER TABLE public.eksamensopgave_del ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese eksamensopgave_del" ON public.eksamensopgave_del FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere eksamensopgave_del" ON public.eksamensopgave_del FOR ALL TO authenticated USING (true) WITH CHECK (true);
