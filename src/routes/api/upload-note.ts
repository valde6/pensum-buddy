import { createFileRoute } from "@tanstack/react-router";
import { stripHtml } from "@/lib/stripHtml";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const token = auth?.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env["NOTE_UPLOAD_TOKEN"];
  return Boolean(expected && token && token === expected);
}

type Begreb = { navn: string; definition: string };
type UploadBody = {
  fag_navn: string;
  nummer: number;
  dato: string; // ISO YYYY-MM-DD
  emne: string;
  html: string;
  begreber?: Begreb[];
};

// Login-frit endpoint til Cowork-agentens note-pipeline: agenten lister
// forelæsninger uden note (GET) og uploader genererede noter (POST). Auth
// sker via et delt token (NOTE_UPLOAD_TOKEN), ikke bruger-login, så vi
// bruger service role-klienten frem for supabaseForRequest.
export const Route = createFileRoute("/api/upload-note")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!checkAuth(request)) {
          return json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("forelaesning")
          .select("nummer, emne, dato, note_html, fag:fag_id(navn)")
          .order("nummer");
        if (error) return json({ error: error.message }, { status: 400 });

        return json(
          (data ?? []).map((f) => ({
            fag_navn: (f.fag as unknown as { navn: string } | null)?.navn ?? null,
            nummer: f.nummer,
            emne: f.emne,
            dato: f.dato,
            harNote: Boolean(f.note_html),
          })),
        );
      },

      POST: async ({ request }) => {
        if (!checkAuth(request)) {
          return json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as Partial<UploadBody>;
        const { fag_navn, nummer, dato, emne, html, begreber } = body;

        if (!fag_navn || !nummer || !dato || !emne || !html) {
          return json(
            { error: "Manglende felter (fag_navn, nummer, dato, emne, html)" },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: fag, error: fagFejl } = await supabaseAdmin
          .from("fag")
          .select("id")
          .eq("navn", fag_navn)
          .maybeSingle();
        if (fagFejl) return json({ error: fagFejl.message }, { status: 400 });
        if (!fag) return json({ error: `Fag ikke fundet: ${fag_navn}` }, { status: 404 });

        const noteTekst = stripHtml(html);

        const { data: forelaesning, error: flFejl } = await supabaseAdmin
          .from("forelaesning")
          .upsert(
            {
              fag_id: fag.id,
              nummer,
              dato,
              emne,
              note_html: html,
              note_tekst: noteTekst,
            },
            { onConflict: "fag_id,nummer" },
          )
          .select("id")
          .single();
        if (flFejl) return json({ error: flFejl.message }, { status: 400 });

        // Begreber: skip hvis EXACT match (samme navn OG samme definition for
        // samme fag findes allerede). Ellers insert.
        let indsat = 0;
        let oversprunget = 0;
        for (const b of begreber ?? []) {
          if (!b.navn?.trim() || !b.definition?.trim()) {
            oversprunget++;
            continue;
          }
          const { data: match } = await supabaseAdmin
            .from("begreb")
            .select("id")
            .eq("fag_id", fag.id)
            .eq("navn", b.navn.trim())
            .eq("definition", b.definition.trim())
            .maybeSingle();
          if (match) {
            oversprunget++;
            continue;
          }
          const { error: bFejl } = await supabaseAdmin.from("begreb").insert({
            fag_id: fag.id,
            forelaesning_id: forelaesning.id,
            navn: b.navn.trim(),
            definition: b.definition.trim(),
          });
          if (bFejl) {
            oversprunget++;
          } else {
            indsat++;
          }
        }

        return json({
          success: true,
          forelaesning_id: forelaesning.id,
          begreber_indsat: indsat,
          begreber_oversprunget: oversprunget,
        });
      },
    },
  },
});
