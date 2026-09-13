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

type CanvasAssignmentInput = {
  canvas_assignment_id: string;
  canvas_kursus_id: string;
  titel: string;
  beskrivelse_html: string | null;
  forfaldsdato: string | null;
  tilgaengelig_fra: string | null;
  points: number | null;
  url_til_canvas: string | null;
  submission_types: string[] | null;
  submission_state: string | null;
  submitted_at: string | null;
  late: boolean;
  missing: boolean;
};

// Modtager assignments hentet client-side fra Canvas GraphQL (se
// syncCanvasOpgaver i src/lib/pensum.ts) og upserter dem til canvas_opgave.
// Kalder aldrig selv Canvas — rent en Supabase-skrivning.
export const Route = createFileRoute("/api/canvas-opgaver/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        const body = (await request.json()) as { assignments?: CanvasAssignmentInput[] };
        const assignments = Array.isArray(body.assignments) ? body.assignments : [];
        if (assignments.length === 0) {
          return json({ ok: true, antal: 0 });
        }

        const { data: fagListe, error: fagError } = await supabase
          .from("fag")
          .select("id, canvas_kursus_id")
          .not("canvas_kursus_id", "is", null);
        if (fagError) return json({ error: fagError.message }, { status: 400 });

        const fagForKursusId = new Map((fagListe ?? []).map((f) => [f.canvas_kursus_id, f.id]));

        const rows: Database["public"]["Tables"]["canvas_opgave"]["Insert"][] = [];
        for (const a of assignments) {
          const fagId = fagForKursusId.get(a.canvas_kursus_id);
          if (!fagId) continue;

          rows.push({
            fag_id: fagId,
            canvas_kursus_id: a.canvas_kursus_id,
            canvas_assignment_id: a.canvas_assignment_id,
            titel: a.titel,
            beskrivelse_html: a.beskrivelse_html ?? null,
            forfaldsdato: a.forfaldsdato ?? null,
            tilgaengelig_fra: a.tilgaengelig_fra ?? null,
            points: a.points ?? null,
            url_til_canvas: a.url_til_canvas ?? null,
            submission_types: a.submission_types ?? null,
            submission_state: a.submission_state ?? null,
            submitted_at: a.submitted_at ?? null,
            late: a.late ?? false,
            missing: a.missing ?? false,
            sidst_synkroniseret: new Date().toISOString(),
          });
        }

        if (rows.length > 0) {
          const { error: upsertError } = await supabase
            .from("canvas_opgave")
            .upsert(rows, { onConflict: "canvas_assignment_id" });
          if (upsertError) return json({ error: upsertError.message }, { status: 400 });
        }

        return json({ ok: true, antal: assignments.length });
      },
    },
  },
});
