import { createFileRoute } from "@tanstack/react-router";
import { async as ical, type ParameterValue, type VEvent } from "node-ical";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseForRequest } from "@/lib/api/supabase";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

function tekst(v: ParameterValue | undefined): string {
  if (v == null) return "";
  return typeof v === "string" ? v : v.val;
}

// SUMMARY-format: "<fagnavn> (LA|XB) … (<type>) <stedangivelse>" — typen er
// den sidste del i parentes, før den friteksts stedangivelse.
function parsSummary(summary: string) {
  const sporMatch = /^(.*?)\s*\((LA|XB)\)\s*(.*)$/i.exec(summary);
  if (!sporMatch) return null;

  const fagNavn = sporMatch[1]!.trim();
  const spor = sporMatch[2]!.toUpperCase() as "LA" | "XB";
  if (!fagNavn) return null;

  const resten = sporMatch[3]!.trim();
  const parenteser = [...resten.matchAll(/\(([^)]+)\)/g)];
  const type = parenteser.length > 0 ? parenteser[parenteser.length - 1]![1]!.trim() : resten;

  return { fagNavn, spor, type };
}

function datoUdenKlokkeslaet(d: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(d);
}

export const Route = createFileRoute("/api/kalender")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        // RLS begrænser rækken til den kaldende bruger — ingen ekstra .eq nødvendig.
        const { data: kalender, error: kalenderError } = await supabase
          .from("bruger_kalender")
          .select("ics_url")
          .maybeSingle();
        if (kalenderError) return json({ error: kalenderError.message }, { status: 400 });
        if (!kalender) return json({ harKalender: false });

        let feed: Awaited<ReturnType<typeof ical.fromURL>>;
        try {
          feed = await ical.fromURL(kalender.ics_url);
        } catch {
          // ics_url behandles som en hemmelighed og må aldrig med i fejlsvaret.
          return json({ error: "Kunne ikke hente kalenderfeedet" }, { status: 502 });
        }

        const nu = Date.now();
        const events: VEvent[] = [];
        for (const entry of Object.values(feed)) {
          if (entry && entry.type === "VEVENT" && entry.start.getTime() > nu) {
            events.push(entry);
          }
        }

        const { data: fagListe, error: fagError } = await supabase.from("fag").select("id, navn");
        if (fagError) return json({ error: fagError.message }, { status: 400 });
        const fagIdForNavn = new Map((fagListe ?? []).map((f) => [f.navn, f.id]));

        const kandidater = events
          .map((event) => {
            const parset = parsSummary(tekst(event.summary));
            if (!parset) return null;
            const fagId = fagIdForNavn.get(parset.fagNavn);
            if (!fagId) return null;

            const lokale = tekst(event.location).trim();
            return {
              fagId,
              fagNavn: parset.fagNavn,
              spor: parset.spor,
              type: parset.type,
              start: event.start,
              slut: event.end ?? event.start,
              lokale: lokale || null,
              dato: datoUdenKlokkeslaet(event.start),
            };
          })
          .filter((k): k is NonNullable<typeof k> => k !== null);

        const fagIds = [...new Set(kandidater.map((k) => k.fagId))];
        const forelaesningIdFor = new Map<string, string>();
        if (fagIds.length > 0) {
          const { data: forelaesninger, error: forelaesningError } = await supabase
            .from("forelaesning")
            .select("id, fag_id, dato")
            .in("fag_id", fagIds);
          if (forelaesningError) {
            return json({ error: forelaesningError.message }, { status: 400 });
          }
          for (const fl of forelaesninger ?? []) {
            if (fl.dato) forelaesningIdFor.set(`${fl.fag_id}|${fl.dato}`, fl.id);
          }
        }

        const begivenheder = kandidater
          .map((k) => ({
            fagId: k.fagId,
            fagNavn: k.fagNavn,
            spor: k.spor,
            type: k.type,
            start: k.start.toISOString(),
            slut: k.slut.toISOString(),
            lokale: k.lokale,
            forelaesningId: forelaesningIdFor.get(`${k.fagId}|${k.dato}`) ?? null,
          }))
          .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

        return json({ harKalender: true, begivenheder });
      },
    },
  },
});
