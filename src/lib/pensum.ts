import { supabase } from "@/integrations/supabase/client";

export const STATUSSER = ["ikke startet", "gennemgået", "repeteret"] as const;
export type Status = (typeof STATUSSER)[number];

export type Fag = {
  id: string;
  navn: string;
  ects: number;
  eksamensform: string | null;
  eksamensperiode: string | null;
  semester: string | null;
  eksamensdato: string | null;
  laeringsmaal: string | null;
  kursusindhold: string | null;
  eksamensdetaljer: string | null;
};

export type Forelaesning = {
  id: string;
  fag_id: string;
  nummer: number;
  dato: string | null;
  emne: string;
  note_url: string | null;
  note_html: string | null;
  note_tekst: string | null;
};

export type Begreb = {
  id: string;
  fag_id: string;
  forelaesning_id: string | null;
  navn: string;
  definition: string | null;
};

export type Eksamen = {
  id: string;
  fag_id: string;
  navn: string | null;
  dato: string | null;
  vaegt: number | null;
};

export type Eksamensopgave = {
  id: string;
  eksamen_id: string;
  titel: string;
  periode: string | null;
  proeveform: string | null;
};

export type EksamensopgaveDel = {
  id: string;
  eksamensopgave_id: string;
  nummer: number;
  vaegt: number | null;
  emne: string;
  beskrivelse: string | null;
};

export type EksamensopgaveMedDele = Eksamensopgave & { dele: EksamensopgaveDel[] };

export type Litteratur = {
  id: string;
  fag_id: string;
  titel: string;
  forfatter: string | null;
  type: string | null;
  url: string | null;
};

export type Fremgang = {
  id: string;
  bruger_id: string;
  forelaesning_id: string;
  status: string;
};

export type BegrebRepetition = {
  id: string;
  bruger_id: string;
  begreb_id: string;
  sidst_repeteret: string;
  kunne_den: boolean;
};

export type Kommentar = {
  id: string;
  forelaesning_id: string;
  bruger_id: string;
  tekst: string;
  oprettet_dato: string;
};

export type BrugerKalender = {
  id: string;
  bruger_id: string;
  ics_url: string;
  opdateret_dato: string;
};

export type KalenderBegivenhed = {
  fagId: string;
  fagNavn: string;
  spor: "LA" | "XB";
  type: string;
  start: string;
  slut: string;
  lokale: string | null;
  forelaesningId: string | null;
};

export type KalenderSvar =
  | { harKalender: false }
  | { harKalender: true; begivenheder: KalenderBegivenhed[] };

export type FremdriftTal = { forbi: number; total: number };

export type ForelaesningsFremdrift =
  | { tilknyttet: false }
  | { tilknyttet: true; forelaesninger: FremdriftTal; ovelser: FremdriftTal };

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export async function hentFag() {
  return unwrap<Fag[]>(await supabase.from("fag").select("*").order("navn"));
}

export async function hentForelaesninger(fagId?: string) {
  let q = supabase.from("forelaesning").select("*").order("nummer");
  if (fagId) q = q.eq("fag_id", fagId);
  return unwrap<Forelaesning[]>(await q);
}

export async function hentBegreber() {
  return unwrap<Begreb[]>(await supabase.from("begreb").select("*").order("navn"));
}

export async function hentLitteratur(fagId?: string) {
  let q = supabase.from("litteratur").select("*").order("titel");
  if (fagId) q = q.eq("fag_id", fagId);
  return unwrap<Litteratur[]>(await q);
}

export async function hentEksamener(fagId?: string) {
  let q = supabase.from("eksamen").select("*").order("dato", { nullsFirst: false });
  if (fagId) q = q.eq("fag_id", fagId);
  return unwrap<Eksamen[]>(await q);
}

// Henter alle eksamensopgaver (på tværs af eksamen) — fagsiden grupperer dem
// selv efter eksamen_id og slår op pr. eksamen-række, samme mønster som
// hentKommentarer().
export async function hentEksamensopgaver(): Promise<EksamensopgaveMedDele[]> {
  const opgaver = unwrap<Eksamensopgave[]>(
    await supabase.from("eksamensopgave").select("*").order("created_at"),
  );
  if (opgaver.length === 0) return [];

  const dele = unwrap<EksamensopgaveDel[]>(
    await supabase
      .from("eksamensopgave_del")
      .select("*")
      .in(
        "eksamensopgave_id",
        opgaver.map((o) => o.id),
      )
      .order("nummer"),
  );

  return opgaver.map((o) => ({
    ...o,
    dele: dele.filter((d) => d.eksamensopgave_id === o.id),
  }));
}

export async function hentMinFremgang() {
  return unwrap<Fremgang[]>(await supabase.from("fremgang").select("*"));
}

export async function saetStatus(forelaesningId: string, status: Status) {
  const { data: auth } = await supabase.auth.getUser();
  const brugerId = auth.user?.id;
  if (!brugerId) throw new Error("Ingen bruger");
  const { error } = await supabase.from("fremgang").upsert(
    {
      bruger_id: brugerId,
      forelaesning_id: forelaesningId,
      status,
      opdateret_dato: new Date().toISOString(),
    },
    { onConflict: "bruger_id,forelaesning_id" },
  );
  if (error) throw new Error(error.message);
}

export async function hentKommentarer() {
  return unwrap<Kommentar[]>(
    await supabase.from("kommentar").select("*").order("oprettet_dato"),
  );
}

export async function tilfoejKommentar(forelaesningId: string, tekst: string) {
  const { data: auth } = await supabase.auth.getUser();
  const brugerId = auth.user?.id;
  if (!brugerId) throw new Error("Ingen bruger");
  const { error } = await supabase.from("kommentar").insert({
    forelaesning_id: forelaesningId,
    bruger_id: brugerId,
    tekst,
  });
  if (error) throw new Error(error.message);
}

export async function hentMinRepetition() {
  return unwrap<BegrebRepetition[]>(await supabase.from("begreb_repetition").select("*"));
}

export async function saetRepetition(begrebId: string, kunneDen: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  const brugerId = auth.user?.id;
  if (!brugerId) throw new Error("Ingen bruger");
  const { error } = await supabase.from("begreb_repetition").upsert(
    {
      bruger_id: brugerId,
      begreb_id: begrebId,
      sidst_repeteret: new Date().toISOString(),
      kunne_den: kunneDen,
    },
    { onConflict: "bruger_id,begreb_id" },
  );
  if (error) throw new Error(error.message);
}

// Prioritér begreber uden nogen repetition endnu, dernæst dem der er længst
// tid siden sidst er blevet repeteret.
export function vaelgNaesteBegreb(begreber: Begreb[], repetition: BegrebRepetition[]) {
  const repetitionFor = new Map(repetition.map((r) => [r.begreb_id, r]));
  const ikkeRepeteret = begreber.filter((b) => !repetitionFor.has(b.id));
  if (ikkeRepeteret.length > 0) return ikkeRepeteret[0];

  return [...begreber].sort((a, b) => {
    const sidstA = repetitionFor.get(a.id)?.sidst_repeteret ?? "";
    const sidstB = repetitionFor.get(b.id)?.sidst_repeteret ?? "";
    return sidstA < sidstB ? -1 : sidstA > sidstB ? 1 : 0;
  })[0];
}

export async function hentMinKalender() {
  const { data, error } = await supabase.from("bruger_kalender").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data as BrugerKalender | null;
}

export async function gemKalenderUrl(icsUrl: string) {
  const { data: auth } = await supabase.auth.getUser();
  const brugerId = auth.user?.id;
  if (!brugerId) throw new Error("Ingen bruger");
  const { error } = await supabase
    .from("bruger_kalender")
    .upsert({ bruger_id: brugerId, ics_url: icsUrl }, { onConflict: "bruger_id" });
  if (error) throw new Error(error.message);
}

// ICS-feedet hentes server-side af /api/kalender (CORS ville ellers blokere det,
// og url'en skal aldrig ud i browserens netværkstrafik).
async function kaldKalenderApi(url: string): Promise<KalenderSvar> {
  const { data: auth } = await supabase.auth.getSession();
  const token = auth.session?.access_token;
  if (!token) throw new Error("Ingen bruger");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Kunne ikke hente kalenderen (status ${res.status})`);
  return (await res.json()) as KalenderSvar;
}

export async function hentKalender(): Promise<KalenderSvar> {
  return kaldKalenderApi("/api/kalender");
}

// Som hentKalender, men begrænset til begivenheder med start >= fra (ISO-dato) —
// bruges af Dashboard til "I dag i kalenderen". hentKalender selv holdes med
// uændret nul-argument-signatur, så den forbliver kompatibel som bar queryFn
// i kalender.tsx.
export async function hentKalenderFra(fra: string): Promise<KalenderSvar> {
  return kaldKalenderApi(`/api/kalender?fra=${encodeURIComponent(fra)}`);
}

function taelFremdrift(begivenheder: KalenderBegivenhed[], iDagKl0000: Date): FremdriftTal {
  const total = begivenheder.length;
  const forbi = begivenheder.filter((b) => new Date(b.start) < iDagKl0000).length;
  return { forbi, total };
}

// Udleder "Dine forelæsninger"-fremdrift direkte af kalenderen i stedet for
// fremgang-tabellen: hvor mange af fagets skemalagte forelæsninger (spor "LA")
// og øvelsestimer (spor "XB") der allerede har fundet sted, ud af det samlede
// antal i semesteret — talt separat for de to spor. Rører aldrig fremgang —
// det er en helt separat, kalenderudledt tæller. "fra" sat langt tilbage i
// semesterets start, så både afholdte og kommende timer tælles med (ikke kun
// /api/kalenders normale "kun fremtidige").
export async function hentForelaesningsFremdrift(fagId: string): Promise<ForelaesningsFremdrift> {
  const svar = await kaldKalenderApi(`/api/kalender?fra=${encodeURIComponent("2026-01-01")}`);
  if (!svar.harKalender) return { tilknyttet: false };

  const iDagKl0000 = new Date();
  iDagKl0000.setHours(0, 0, 0, 0);

  const begivenhederForFag = svar.begivenheder.filter((b) => b.fagId === fagId);
  const forelaesninger = taelFremdrift(
    begivenhederForFag.filter((b) => b.spor === "LA"),
    iDagKl0000,
  );
  const ovelser = taelFremdrift(
    begivenhederForFag.filter((b) => b.spor === "XB"),
    iDagKl0000,
  );

  return { tilknyttet: true, forelaesninger, ovelser };
}

export async function tilfoejForelaesning(input: {
  fag_id: string;
  nummer: number;
  dato: string | null;
  emne: string;
  note_url: string | null;
}) {
  const { error } = await supabase.from("forelaesning").insert(input);
  if (error) throw new Error(error.message);
}

export function formatDato(dato: string | null) {
  if (!dato) return "—";
  return new Date(dato).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatEksamensdato(dato: string | null) {
  if (!dato) return "Dato endnu ikke fastsat";
  return new Date(dato).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTidspunkt(dato: string) {
  return new Date(dato).toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatKlokkeslaet(dato: string) {
  return new Date(dato).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

export function formatDag(dato: string) {
  return new Date(dato).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function dageTil(dato: string) {
  const ms = new Date(dato).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function statusFarve(status: string) {
  if (status === "gennemgået") return "bg-sage-soft text-sage ring-sage/20";
  if (status === "repeteret") return "bg-clay-soft text-clay ring-clay/20";
  return "bg-steel-soft text-steel ring-steel/20";
}
