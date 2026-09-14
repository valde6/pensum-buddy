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

// Kopieret fra supabase/functions/send-feedback/index.ts — se den fil for
// baggrund. Denne route erstatter Edge Function-kaldet.
function escapeHtml(tekst: string) {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type FeedbackBody = {
  type?: string;
  titel?: string;
  beskrivelse?: string;
  side?: string;
};

export const Route = createFileRoute("/api/send-feedback")({
  server: {
    handlers: {
      GET: async () => json({ error: "Method not allowed" }, { status: 405 }),

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

        let body: FeedbackBody;
        try {
          body = (await request.json()) as FeedbackBody;
        } catch {
          return json({ error: "Ugyldigt request-body" }, { status: 400 });
        }

        const { type, titel, beskrivelse, side } = body;
        if (!type || !titel) {
          return json({ error: "Mangler type eller titel" }, { status: 400 });
        }

        const resendApiKey = process.env["RESEND_API_KEY"];
        const modtager = process.env["FEEDBACK_RECIPIENT_EMAIL"];
        if (!resendApiKey || !modtager) {
          console.error("Mangler RESEND_API_KEY og/eller FEEDBACK_RECIPIENT_EMAIL");
          return json({ error: "Feedback er ikke konfigureret" }, { status: 500 });
        }

        const tidspunkt = new Date().toLocaleString("da-DK", {
          timeZone: "Europe/Copenhagen",
          dateStyle: "long",
          timeStyle: "short",
        });

        const html = `
          <h2>Ny feedback fra Pensummit</h2>
          <p><strong>Type:</strong> ${escapeHtml(type)}</p>
          <p><strong>Titel:</strong> ${escapeHtml(titel)}</p>
          <p><strong>Beskrivelse:</strong></p>
          <p>${escapeHtml(beskrivelse ?? "").replace(/\n/g, "<br>")}</p>
          <hr>
          <p><strong>Fra:</strong> ${escapeHtml(user.email ?? "ukendt")}</p>
          <p><strong>Side:</strong> ${escapeHtml(side ?? "ukendt")}</p>
          <p><strong>Tidspunkt:</strong> ${tidspunkt}</p>
        `;

        let resendRes: Response;
        try {
          resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Pensummit <onboarding@resend.dev>",
              to: modtager,
              subject: `Pensummit feedback: ${type} — ${titel}`,
              html,
            }),
          });
        } catch (e) {
          console.error("Kunne ikke kontakte Resend", e);
          return json({ error: "Kunne ikke sende feedback" }, { status: 502 });
        }

        if (!resendRes.ok) {
          console.error("Resend fejlede", resendRes.status, await resendRes.text());
          return json({ error: "Kunne ikke sende feedback" }, { status: 502 });
        }

        return json({ success: true });
      },
    },
  },
});
