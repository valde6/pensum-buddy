CREATE TABLE public.begreb_repetition (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bruger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  begreb_id uuid NOT NULL REFERENCES public.begreb(id) ON DELETE CASCADE,
  sidst_repeteret timestamptz NOT NULL DEFAULT now(),
  kunne_den boolean NOT NULL,
  UNIQUE (bruger_id, begreb_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.begreb_repetition TO authenticated;
GRANT ALL ON public.begreb_repetition TO service_role;
ALTER TABLE public.begreb_repetition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Egen repetition" ON public.begreb_repetition FOR ALL TO authenticated USING (bruger_id = auth.uid()) WITH CHECK (bruger_id = auth.uid());
