import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseForRequest } from "@/lib/api/supabase";
import { stripHtml } from "@/lib/stripHtml";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

async function hentFagVedNavn(supabase: SupabaseClient<Database>, fagNavn: string) {
  const { data, error } = await supabase
    .from("fag")
    .select("id, navn")
    .eq("navn", fagNavn)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

type NyForelaesningBody = {
  nummer: number;
  dato: string;
  emne: string;
  html: string;
};

export const Route = createFileRoute("/api/fag/$fagNavn/forelaesninger")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        const fag = await hentFagVedNavn(supabase, params.fagNavn);
        if (!fag) return json({ error: "Fag ikke fundet" }, { status: 404 });

        const { data, error } = await supabase
          .from("forelaesning")
          .select("id, nummer, dato, emne, note_html, note_url")
          .eq("fag_id", fag.id)
          .order("nummer");
        if (error) return json({ error: error.message }, { status: 400 });

        return json(
          (data ?? []).map((fl) => ({
            id: fl.id,
            nummer: fl.nummer,
            dato: fl.dato,
            emne: fl.emne,
            harNote: Boolean(fl.note_html),
            note_url: fl.note_url,
          })),
        );
      },

      POST: async ({ request, params }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        const fag = await hentFagVedNavn(supabase, params.fagNavn);
        if (!fag) return json({ error: "Fag ikke fundet" }, { status: 404 });

        const body = (await request.json()) as Partial<NyForelaesningBody>;
        if (!body.nummer || !body.dato || !body.emne || !body.html) {
          return json({ error: "Mangler nummer, dato, emne eller html" }, { status: 400 });
        }

        const noteTekst = stripHtml(body.html);

        const { data, error } = await supabase
          .from("forelaesning")
          .upsert(
            {
              fag_id: fag.id,
              nummer: body.nummer,
              dato: body.dato,
              emne: body.emne,
              note_html: body.html,
              note_tekst: noteTekst,
            },
            { onConflict: "fag_id,nummer" },
          )
          .select("id")
          .single();
        if (error) return json({ error: error.message }, { status: 400 });

        return json({
          id: data.id,
          fagNavn: fag.navn,
          nummer: body.nummer,
          url: `/fag/${fag.id}/noter/${data.id}`,
        });
      },
    },
  },
});
