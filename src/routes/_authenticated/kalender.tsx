import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  formatDag,
  formatKlokkeslaet,
  gemCanvasToken,
  gemKalenderUrl,
  hentCanvasOpgaver,
  hentForelaesninger,
  hentKalender,
  syncCanvasOpgaver,
  type CanvasOpgave,
  type KalenderBegivenhed,
} from "@/lib/pensum";

function dagNoegleFraISO(iso: string): string {
  return iso.slice(0, 10);
}

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
  const queryClient = useQueryClient();
  const [visOevelser, setVisOevelser] = useState(false);

  useEffect(() => {
    syncCanvasOpgaver()
      .then(() => queryClient.invalidateQueries({ queryKey: ["canvasOpgaver"] }))
      .catch(console.error);
  }, [queryClient]);

  const kalender = useQuery({ queryKey: ["kalender"], queryFn: hentKalender });
  const forelaesninger = useQuery({
    queryKey: ["forelaesning"],
    queryFn: () => hentForelaesninger(),
  });
  const canvasOpgaver = useQuery({
    queryKey: ["canvasOpgaver"],
    queryFn: hentCanvasOpgaver,
  });

  const opgaver: CanvasOpgave[] = canvasOpgaver.data?.harToken
    ? canvasOpgaver.data.opgaver
    : [];

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

  const opgaveGrupper = new Map<string, CanvasOpgave[]>();
  for (const o of opgaver) {
    if (!o.forfaldsdato) continue;
    const dagNoegle = dagNoegleFraISO(o.forfaldsdato);
    if (!opgaveGrupper.has(dagNoegle)) opgaveGrupper.set(dagNoegle, []);
    opgaveGrupper.get(dagNoegle)!.push(o);
  }

  const alleDagNoegler = [...new Set([...grupper.keys(), ...opgaveGrupper.keys()])].sort();

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

          {alleDagNoegler.length === 0 && (
            <p className="mt-6 text-sm text-ink-soft">Ingen kommende begivenheder.</p>
          )}

          {alleDagNoegler.map((dagNoegle) => {
            const begivenheder = grupper.get(dagNoegle) ?? [];
            const dagOpgaver = opgaveGrupper.get(dagNoegle) ?? [];
            const eksempelIso = begivenheder[0]?.start ?? dagOpgaver[0]!.forfaldsdato!;
            return (
              <section key={dagNoegle} className="mt-8 first:mt-6">
                <div className="mb-3 inline-flex items-baseline gap-2 rounded-full bg-steel-soft px-3.5 py-1.5">
                  <span className="font-display text-sm font-semibold tracking-tight text-steel">
                    {dagOverskrift(dagNoegle, eksempelIso)}
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
                  {dagOpgaver.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col gap-2 border-l-2 border-clay px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{o.titel}</p>
                        <p className="label-mono mt-0.5 normal-case tracking-normal">
                          {o.fag?.navn ?? "Ukendt fag"} · Aflevering ·{" "}
                          {o.forfaldsdato
                            ? new Date(o.forfaldsdato).toLocaleTimeString("da-DK", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={[
                            "label-mono rounded-full px-2.5 py-1 normal-case tracking-normal",
                            o.submission_state === "submitted" || o.submission_state === "graded"
                              ? "bg-sage/20 text-sage"
                              : o.missing
                                ? "bg-clay/20 text-clay"
                                : "bg-steel-soft text-steel",
                          ].join(" ")}
                        >
                          {o.submission_state === "submitted" || o.submission_state === "graded"
                            ? "Afleveret"
                            : o.missing
                              ? "Mangler"
                              : "Ikke afleveret"}
                        </span>
                        {o.url_til_canvas && (
                          <a
                            href={o.url_til_canvas}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-sm font-medium text-steel underline-offset-4 hover:underline"
                          >
                            Åbn i Canvas
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      <CanvasTokenForm />
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

function CanvasTokenForm() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [besked, setBesked] = useState<string | null>(null);

  const gem = useMutation({
    mutationFn: (t: string) => gemCanvasToken(t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvasOpgaver"] });
      setToken("");
      setBesked("Canvas-token gemt.");
    },
    onError: (e: Error) => setBesked(`Kunne ikke gemme Canvas-token: ${e.message}`),
  });

  return (
    <div className="panel mt-6 max-w-xl space-y-4 p-6 sm:p-8">
      <div>
        <p className="label-mono">Canvas Access Token</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Generér et token under Account → Settings → New Access Token på
          cbscanvas.instructure.com. Tokenet gemmes sikkert og bruges til automatisk at hente
          dine obligatoriske opgaver.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBesked(null);
          const t = token.trim();
          if (t) gem.mutate(t);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="password"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Canvas access token"
          className="w-full flex-1 rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40"
        />
        <button
          type="submit"
          disabled={gem.isPending || !token.trim()}
          className="label-mono shrink-0 rounded-full bg-steel-soft px-4 py-2.5 normal-case tracking-normal disabled:opacity-60"
        >
          {gem.isPending ? "Gemmer…" : "Gem token"}
        </button>
      </form>
      {besked && <p className="text-sm text-ink-soft">{besked}</p>}
    </div>
  );
}
