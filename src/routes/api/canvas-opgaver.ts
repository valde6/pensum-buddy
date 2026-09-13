import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseForRequest } from "@/lib/api/supabase";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

const CANVAS_BASE_URL = "https://cbscanvas.instructure.com";

type CanvasSubmission = {
  workflow_state?: string | null;
  submitted_at?: string | null;
  late?: boolean;
  missing?: boolean;
};

type CanvasAssignment = {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  unlock_at: string | null;
  points_possible: number | null;
  html_url: string;
  submission_types: string[];
  submission?: CanvasSubmission;
};

// Henter alle assignments for ét Canvas-kursus. Kastes videre til den kaldende
// Promise.all/allSettled, så ét fejlende fag ikke vælter de andre.
async function hentCanvasAssignments(
  kursusId: string,
  token: string,
): Promise<CanvasAssignment[]> {
  const url = `${CANVAS_BASE_URL}/api/v1/courses/${kursusId}/assignments?per_page=50&order_by=due_at&include[]=submission`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log("[canvas] henter fag", kursusId, "status:", res.status);
  if (!res.ok) {
    const fejltekst = await res.text();
    console.error("[canvas] Canvas fejl for", kursusId, ":", fejltekst);
    throw new Error(`Canvas svarede ${res.status} for kursus ${kursusId}`);
  }
  return (await res.json()) as CanvasAssignment[];
}

export const Route = createFileRoute("/api/canvas-opgaver")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        // RLS begrænser rækken til den kaldende bruger — token forlader aldrig
        // denne handler og optræder aldrig i noget svar.
        const { data: tokenRaekke, error: tokenError } = await supabase
          .from("bruger_canvas_token")
          .select("token")
          .maybeSingle();
        if (tokenError) return json({ error: tokenError.message }, { status: 400 });
        if (!tokenRaekke) return json({ harToken: false });

        const { data: fagListe, error: fagError } = await supabase
          .from("fag")
          .select("id, navn, canvas_kursus_id")
          .not("canvas_kursus_id", "is", null);
        if (fagError) return json({ error: fagError.message }, { status: 400 });
        console.log("[canvas] fag med kursus-id:", fagListe?.length);

        const fagMedKursus = (fagListe ?? []).filter(
          (f): f is typeof f & { canvas_kursus_id: string } => f.canvas_kursus_id != null,
        );

        const resultater = await Promise.allSettled(
          fagMedKursus.map(async (fag) => ({
            fag,
            assignments: await hentCanvasAssignments(fag.canvas_kursus_id, tokenRaekke.token),
          })),
        );

        const alleAssignments = resultater.flatMap((r) =>
          r.status === "fulfilled" ? r.value.assignments : [],
        );
        console.log("[canvas] assignments fra Canvas:", alleAssignments.length);

        const rows: Database["public"]["Tables"]["canvas_opgave"]["Insert"][] = [];
        for (const resultat of resultater) {
          if (resultat.status === "rejected") {
            console.error("Canvas-synkronisering fejlede for et fag:", resultat.reason);
            continue;
          }
          const { fag, assignments } = resultat.value;
          for (const a of assignments) {
            rows.push({
              fag_id: fag.id,
              canvas_kursus_id: fag.canvas_kursus_id,
              canvas_assignment_id: a.id.toString(),
              titel: a.name,
              beskrivelse_html: a.description ?? null,
              forfaldsdato: a.due_at ?? null,
              tilgaengelig_fra: a.unlock_at ?? null,
              points: a.points_possible ?? null,
              url_til_canvas: a.html_url,
              submission_types: a.submission_types,
              submission_state: a.submission?.workflow_state ?? null,
              submitted_at: a.submission?.submitted_at ?? null,
              late: a.submission?.late ?? false,
              missing: a.submission?.missing ?? false,
              sidst_synkroniseret: new Date().toISOString(),
            });
          }
        }

        if (rows.length > 0) {
          const { error: upsertError } = await supabase
            .from("canvas_opgave")
            .upsert(rows, { onConflict: "canvas_assignment_id" });
          if (upsertError) console.error("[canvas] upsert fejl:", upsertError.message);
          if (upsertError) return json({ error: upsertError.message }, { status: 400 });
        }

        const { data: opgaver, error: opgaverError } = await supabase
          .from("canvas_opgave")
          .select("*, fag:fag_id(navn)")
          .order("forfaldsdato", { ascending: true });
        if (opgaverError) return json({ error: opgaverError.message }, { status: 400 });

        return json({ harToken: true, opgaver: opgaver ?? [] });
      },

      POST: async ({ request }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        const {
          data: { user },
          error: brugerError,
        } = await supabase.auth.getUser();
        if (brugerError || !user) {
          return json({ error: "Ikke logget ind" }, { status: 401 });
        }

        const body = (await request.json()) as { token?: unknown };
        const token = typeof body.token === "string" ? body.token.trim() : "";
        if (!token) {
          return json({ error: "Mangler token" }, { status: 400 });
        }

        const { error } = await supabase
          .from("bruger_canvas_token")
          .upsert({ bruger_id: user.id, token }, { onConflict: "bruger_id" });
        if (error) return json({ error: error.message }, { status: 400 });

        return json({ ok: true });
      },
    },
  },
});
