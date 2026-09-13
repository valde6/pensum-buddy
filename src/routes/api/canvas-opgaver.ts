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

export const Route = createFileRoute("/api/canvas-opgaver")({
  server: {
    handlers: {
      // Læser udelukkende fra Supabase. Canvas GraphQL kræver browserens egne
      // sessionscookies og kan derfor ikke kaldes herfra server-side — selve
      // synkroniseringen sker client-side via syncCanvasOpgaver() og
      // POST /api/canvas-opgaver/sync.
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
