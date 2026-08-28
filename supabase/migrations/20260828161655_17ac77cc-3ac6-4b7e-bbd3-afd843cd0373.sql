CREATE TABLE public.fag (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  navn text NOT NULL,
  ects numeric NOT NULL DEFAULT 0,
  eksamensform text,
  eksamensperiode text,
  semester text,
  eksamensdato date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fag TO authenticated;
GRANT ALL ON public.fag TO service_role;
ALTER TABLE public.fag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese fag" ON public.fag FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere fag" ON public.fag FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.forelaesning (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fag_id uuid NOT NULL REFERENCES public.fag(id) ON DELETE CASCADE,
  nummer integer NOT NULL,
  dato date,
  emne text NOT NULL,
  note_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forelaesning TO authenticated;
GRANT ALL ON public.forelaesning TO service_role;
ALTER TABLE public.forelaesning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese forelaesning" ON public.forelaesning FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere forelaesning" ON public.forelaesning FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.begreb (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fag_id uuid NOT NULL REFERENCES public.fag(id) ON DELETE CASCADE,
  forelaesning_id uuid REFERENCES public.forelaesning(id) ON DELETE SET NULL,
  navn text NOT NULL,
  definition text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.begreb TO authenticated;
GRANT ALL ON public.begreb TO service_role;
ALTER TABLE public.begreb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese begreb" ON public.begreb FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere begreb" ON public.begreb FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.litteratur (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fag_id uuid NOT NULL REFERENCES public.fag(id) ON DELETE CASCADE,
  titel text NOT NULL,
  forfatter text,
  type text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.litteratur TO authenticated;
GRANT ALL ON public.litteratur TO service_role;
ALTER TABLE public.litteratur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indloggede kan laese litteratur" ON public.litteratur FOR SELECT TO authenticated USING (true);
CREATE POLICY "Indloggede kan redigere litteratur" ON public.litteratur FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fremgang (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bruger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  forelaesning_id uuid NOT NULL REFERENCES public.forelaesning(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ikke startet',
  opdateret_dato timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bruger_id, forelaesning_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fremgang TO authenticated;
GRANT ALL ON public.fremgang TO service_role;
ALTER TABLE public.fremgang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Egen fremgang" ON public.fremgang FOR ALL TO authenticated USING (bruger_id = auth.uid()) WITH CHECK (bruger_id = auth.uid());

INSERT INTO public.fag (id, navn, ects, eksamensform, eksamensperiode, semester, eksamensdato) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Netværk og digitalisering', 7.5, 'Skriftlig', 'forår', 'forår 2026', '2026-05-08');

INSERT INTO public.forelaesning (id, fag_id, nummer, dato, emne, note_url) VALUES
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 1, '2026-02-12', 'Grundbegreber og arkitektur', 'https://example.github.io/noter/netvaerk-01.html'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 2, '2026-02-19', 'Protokoller og ruting', 'https://example.github.io/noter/netvaerk-02.html'),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 3, '2026-02-26', 'Cloud og distribuerede systemer', 'https://example.github.io/noter/netvaerk-03.html');

INSERT INTO public.begreb (fag_id, forelaesning_id, navn, definition) VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', 'Lagdelt arkitektur', 'Opdeling af netværkskommunikation i lag, hvor hvert lag har et afgrænset ansvar.'),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'TCP/IP', 'Protokolsuite der styrer adressering, pakkeformidling og pålidelig transport på internettet.'),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Latency', 'Forsinkelsen fra en pakke sendes til den modtages, målt i millisekunder.'),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222223', 'Skalerbarhed', 'Et systems evne til at håndtere øget belastning ved at tilføje ressourcer.');

INSERT INTO public.litteratur (fag_id, titel, forfatter, type, url) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Computer Networking: A Top-Down Approach', 'Kurose & Ross', 'bog', NULL),
  ('11111111-1111-4111-8111-111111111111', 'A Brief History of the Internet', 'Leiner et al.', 'artikel', 'https://www.internetsociety.org/internet/history-internet/brief-history-internet/');