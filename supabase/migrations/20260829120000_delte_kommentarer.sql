CREATE TABLE public.kommentar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forelaesning_id uuid NOT NULL REFERENCES public.forelaesning(id) ON DELETE CASCADE,
  bruger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tekst text NOT NULL,
  oprettet_dato timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kommentar TO authenticated;
GRANT ALL ON public.kommentar TO service_role;
ALTER TABLE public.kommentar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese kommentarer" ON public.kommentar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan indsaette kommentarer" ON public.kommentar FOR INSERT TO authenticated WITH CHECK (bruger_id = auth.uid());
CREATE POLICY "Egen kommentar kan opdateres" ON public.kommentar FOR UPDATE TO authenticated USING (bruger_id = auth.uid()) WITH CHECK (bruger_id = auth.uid());
CREATE POLICY "Egen kommentar kan slettes" ON public.kommentar FOR DELETE TO authenticated USING (bruger_id = auth.uid());
