import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  formatDag,
  formatKlokkeslaet,
  gemKalenderUrl,
  hentForelaesninger,
  hentKalender,
  type KalenderBegivenhed,
} from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/kalender")({
  head: () => ({
    meta: [
      { title: "Kalender — Pensummit" },
      {
        name: "description",
        content: "Kommende forelæsninger og øvelser fra dit CBS-skema.",
      },
      { property: "og:title", content: "Kalender — Pensummit" },
      {
        property: "og:description",
        content: "Abonnér på dit CBS-skema og se kommende begivenheder ét sted.",
      },
    ],
  }),
  component: KalenderSide,
});

function KalenderSide() {
  const [visOevelser, setVisOevelser] = useState(false);

  const kalender = useQuery({ queryKey: ["kalender"], queryFn: hentKalender });
  const forelaesninger = useQuery({
    queryKey: ["forelaesning"],
    queryFn: () => hentForelaesninger(),
  });

  const harNoteFor = (id: string) =>
    Boolean((forelaesninger.data ?? []).find((fl) => fl.id === id)?.note_html);

  const synlige =
    kalender.data?.harKalender
      ? kalender.data.begivenheder.filter((b) => b.spor === "LA" || visOevelser)
      : [];

  const grupper = new Map<string, KalenderBegivenhed[]>();
  for (const b of synlige) {
    const dagNoegle = b.start.slice(0, 10);
    if (!grupper.has(dagNoegle)) grupper.set(dagNoegle, []);
    grupper.get(dagNoegle)!.push(b);
  }

  function dagOverskrift(dagNoegle: string, eksempelIso: string) {
    const iDagNoegle = new Date().toISOString().slice(0, 10);
    const iMorgenNoegle = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    if (dagNoegle === iDagNoegle) return "I dag";
    if (dagNoegle === iMorgenNoegle) return "I morgen";
    const dag = formatDag(eksempelIso);
    return dag.charAt(0).toUpperCase() + dag.slice(1);
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
        Kalender
      </h1>
      <p className="mt-3 max-w-[52ch] text-base text-ink-soft">
        Kommende forelæsninger og øvelser fra dit CBS-skema.
      </p>

      {kalender.isLoading ? (
        <p className="mt-6 text-sm text-ink-soft">Indlæser kalender…</p>
      ) : !kalender.data ? (
        <p className="mt-6 text-sm text-ink-soft">Kunne ikke indlæse kalenderen.</p>
      ) : !kalender.data.harKalender ? (
        <IngenKalenderEndnu />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-1.5">
            <button
              onClick={() => setVisOevelser((v) => !v)}
              className={`label-mono rounded-full px-2.5 py-1 normal-case tracking-normal ${
                visOevelser ? "bg-steel text-surface" : "bg-steel-soft"
              }`}
            >
              Vis også øvelser
            </button>
          </div>

          {grupper.size === 0 && (
            <p className="mt-6 text-sm text-ink-soft">Ingen kommende begivenheder.</p>
          )}

          {[...grupper.entries()].map(([dagNoegle, begivenheder]) => (
            <section key={dagNoegle} className="mt-8 first:mt-6">
              <div className="mb-3 inline-flex items-baseline gap-2 rounded-full bg-steel-soft px-3.5 py-1.5">
                <span className="font-display text-sm font-semibold tracking-tight text-steel">
                  {dagOverskrift(dagNoegle, begivenheder[0]!.start)}
                </span>
              </div>
              <div className="panel divide-y divide-line overflow-hidden">
                {begivenheder.map((b) => {
                  const harNote = b.forelaesningId ? harNoteFor(b.forelaesningId) : false;
                  return (
                    <div
                      key={`${b.fagId}-${b.start}`}
                      className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{b.fagNavn}</p>
                        <p className="label-mono mt-0.5 normal-case tracking-normal">
                          {b.type} · {formatKlokkeslaet(b.start)}–{formatKlokkeslaet(b.slut)} ·{" "}
                          {b.lokale ?? "Online"}
                        </p>
                      </div>
                      {b.forelaesningId && harNote ? (
                        <Link
                          to="/fag/$fagId/noter/$forelaesningId"
                          params={{ fagId: b.fagId, forelaesningId: b.forelaesningId }}
                          className="shrink-0 text-sm font-medium text-steel underline-offset-4 hover:underline"
                        >
                          Åbn note
                        </Link>
                      ) : (
                        <Link
                          to="/fag/$fagId"
                          params={{ fagId: b.fagId }}
                          className="shrink-0 text-sm font-medium text-steel underline-offset-4 hover:underline"
                        >
                          Åbn fag
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}

function IngenKalenderEndnu() {
  const queryClient = useQueryClient();
  const [icsUrl, setIcsUrl] = useState("");
  const [besked, setBesked] = useState<string | null>(null);

  const gem = useMutation({
    mutationFn: (url: string) => gemKalenderUrl(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kalender"] });
      setIcsUrl("");
      setBesked(null);
    },
    onError: (e: Error) => setBesked(`Kunne ikke gemme kalenderen: ${e.message}`),
  });

  return (
    <div className="panel mt-6 max-w-xl space-y-4 p-6 sm:p-8">
      <p className="text-sm leading-relaxed text-ink-soft">
        Et "subscribe to calendar"-link er en privat webadresse til dit personlige CBS-skema.
        CBS' skemasystem stiller linket til rådighed under en knap som "Subscribe" eller
        "Abonnér på kalender" — kopiér adressen derfra (den ender typisk på{" "}
        <span className="font-mono">.ics</span>) og indsæt den her.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBesked(null);
          const url = icsUrl.trim();
          if (url) gem.mutate(url);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="url"
          required
          value={icsUrl}
          onChange={(e) => setIcsUrl(e.target.value)}
          placeholder="https://…ics"
          className="w-full flex-1 rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40"
        />
        <button
          type="submit"
          disabled={gem.isPending || !icsUrl.trim()}
          className="label-mono shrink-0 rounded-full bg-steel-soft px-4 py-2.5 normal-case tracking-normal disabled:opacity-60"
        >
          {gem.isPending ? "Gemmer…" : "Gem kalender"}
        </button>
      </form>
      {besked && <p className="text-sm text-ink-soft">{besked}</p>}
    </div>
  );
}
