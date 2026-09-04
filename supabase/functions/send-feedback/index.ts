// Supabase Edge Function: modtager feedback fra appen og sender den videre som
// e-mail via Resend. Kræver en autentificeret bruger (samme JWT-mønster som
// resten af appens auth) og de to hemmeligheder RESEND_API_KEY og
// FEEDBACK_RECIPIENT_EMAIL sat i projektets Edge Function-secrets.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Ikke logget ind" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: brugerFejl,
  } = await supabase.auth.getUser();

  if (brugerFejl || !user) {
    return json({ error: "Ikke logget ind" }, 401);
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return json({ error: "Ugyldigt request-body" }, 400);
  }

  const { type, titel, beskrivelse, side } = body;
  if (!type || !titel) {
    return json({ error: "Mangler type eller titel" }, 400);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const modtager = Deno.env.get("FEEDBACK_RECIPIENT_EMAIL");
  if (!resendApiKey || !modtager) {
    console.error("Mangler RESEND_API_KEY og/eller FEEDBACK_RECIPIENT_EMAIL");
    return json({ error: "Feedback er ikke konfigureret endnu" }, 500);
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
    return json({ error: "Kunne ikke sende feedback" }, 502);
  }

  if (!resendRes.ok) {
    console.error("Resend fejlede", resendRes.status, await resendRes.text());
    return json({ error: "Kunne ikke sende feedback" }, 502);
  }

  return json({ success: true });
});
