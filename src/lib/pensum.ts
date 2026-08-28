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
};

export type Forelaesning = {
  id: string;
  fag_id: string;
  nummer: number;
  dato: string | null;
  emne: string;
  note_url: string | null;
};

export type Begreb = {
  id: string;
  fag_id: string;
  forelaesning_id: string | null;
  navn: string;
  definition: string | null;
};

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

export function dageTil(dato: string) {
  const ms = new Date(dato).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function statusFarve(status: string) {
  if (status === "gennemgået") return "bg-sage-soft text-sage ring-sage/20";
  if (status === "repeteret") return "bg-clay-soft text-clay ring-clay/20";
  return "bg-steel-soft text-steel ring-steel/20";
}
