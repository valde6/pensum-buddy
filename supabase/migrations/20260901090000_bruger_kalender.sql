CREATE TABLE public.bruger_kalender (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bruger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ics_url text NOT NULL,
  opdateret_dato timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bruger_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bruger_kalender TO authenticated;
GRANT ALL ON public.bruger_kalender TO service_role;
ALTER TABLE public.bruger_kalender ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Egen kalender" ON public.bruger_kalender FOR ALL TO authenticated USING (bruger_id = auth.uid()) WITH CHECK (bruger_id = auth.uid());
