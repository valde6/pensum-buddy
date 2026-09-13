import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  dageTil,
  formatDato,
  formatKlokkeslaet,
  hentBegreber,
  hentCanvasOpgaver,
  hentEksamener,
  hentFag,
  hentForelaesninger,
  hentForelaesningsFremdrift,
  hentKalenderFra,
  hentLitteratur,
  hentSamletFremdrift,
  syncCanvasOpgaver,
  type CanvasOpgave,
  type Fag,
} from "@/lib/pensum";
import { eksporterPensumSomPdf } from "@/lib/pensumPdf";
import { FremdriftVisning } from "@/components/FremdriftVisning";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pensummit" },
      {
        name: "description",
        content: "Semesterets fag, eksamensformer og din fremgang samlet på én side.",
      },
      { property: "og:title", content: "Dashboard — Pensummit" },
      {
        property: "og:description",
        content: "Overblik over fag, ECTS, eksamensformer og din egen studiefremgang.",
      },
    ],
  }),
  component: Dashboard,
});

const barFarver = ["bg-steel", "bg-sage", "bg-clay"];

function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    syncCanvasOpgaver()
      .then(() => queryClient.invalidateQueries({ queryKey: ["canvasOpgaver"] }))
      .catch(console.error);
  }, [queryClient]);

  const fag = useQuery({ queryKey: ["fag"], queryFn: hentFag });
  const forelaesninger = useQuery({
    queryKey: ["forelaesning"],
    queryFn: () => hentForelaesninger(),
  });
  const litteratur = useQuery({ queryKey: ["litteratur"], queryFn: () => hentLitteratur() });
  const begreber = useQuery({ queryKey: ["begreb"], queryFn: hentBegreber });
  const eksamener = useQuery({ queryKey: ["eksamen"], queryFn: () => hentEksamener() });
  const samletFremdrift = useQuery({
    queryKey: ["samletFremdrift"],
    queryFn: hentSamletFremdrift,
  });
  const canvasOpgaver = useQuery({
    queryKey: ["canvasOpgaver"],
    queryFn: hentCanvasOpgaver,
  });

  const startAfIDag = new Date();
  startAfIDag.setHours(0, 0, 0, 0);
  const startAfIMorgen = new Date(startAfIDag);
  startAfIMorgen.setDate(startAfIMorgen.getDate() + 1);

  const kalenderIDag = useQuery({
    queryKey: ["kalender", "i-dag", startAfIDag.toISOString()],
    queryFn: () => hentKalenderFra(startAfIDag.toISOString()),
  });

  const begivenhederIDag = kalenderIDag.data?.harKalender
    ? kalenderIDag.data.begivenheder
        .filter((b) => new Date(b.start) < startAfIMorgen)
        .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    : [];

  function haandterPdfEksport() {
    eksporterPensumSomPdf(
      fag.data ?? [],
      forelaesninger.data ?? [],
      litteratur.data ?? [],
      begreber.data ?? [],
    );
  }

  const naesteEksamen = (eksamener.data ?? [])
    .filter((e) => e.dato && new Date(e.dato).getTime() > Date.now())
    .sort((a, b) => (a.dato! < b.dato! ? -1 : 1))[0];
  const naesteEksamenFag = naesteEksamen
    ? (fag.data ?? []).find((f) => f.id === naesteEksamen.fag_id)
    : undefined;

  const samletEcts = (fag.data ?? []).reduce((sum, f) => sum + Number(f.ects ?? 0), 0);

  const kommendeOpgaver: CanvasOpgave[] = canvasOpgaver.data?.harToken
    ? canvasOpgaver.data.opgaver
        .filter(
          (o) =>
            o.submission_state !== "submitted" &&
            o.submission_state !== "graded" &&
            o.forfaldsdato &&
            new Date(o.forfaldsdato).getTime() > Date.now(),
        )
        .slice(0, 6)
    : [];

  return (
    <>
      <section className="panel p-6 sm:p-8">
        {naesteEksamen ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono tracking-[0.18em]">Nærmeste eksamen</p>
              <h1 className="mt-3 max-w-[28ch] font-display text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
                {naesteEksamenFag?.navn ?? "Fag"}
              </h1>
              <p className="mt-3 max-w-[42ch] text-base text-ink-soft">
                {naesteEksamen.navn ?? "Eksamen"} · {formatDato(naesteEksamen.dato)}
              </p>
            </div>
            <div className="flex shrink-0 items-stretch gap-3">
              <div className="rounded-xl bg-steel-soft px-5 py-4 text-center">
                <p className="font-display text-4xl font-semibold leading-none text-steel">
                  {dageTil(naesteEksamen.dato!)}
                </p>
                <p className="label-mono mt-1">Dage</p>
              </div>
              <div className="rounded-xl bg-steel-soft px-5 py-4 text-center">
                <p className="font-display text-4xl font-semibold leading-none text-steel">
                  {Math.ceil(dageTil(naesteEksamen.dato!) / 7)}
                </p>
                <p className="label-mono mt-1">Uger</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="label-mono tracking-[0.18em]">Nærmeste eksamen</p>
            <p className="mt-3 text-base text-ink-soft">
              Ingen kommende eksamensdato er registreret endnu.
            </p>
          </div>
        )}
      </section>

      <section className="panel mt-6 p-6 sm:p-8">
        <p className="label-mono tracking-[0.18em]">Semesteret samlet</p>
        <div className="mt-4">
          <FremdriftVisning
            fremdrift={samletFremdrift.data}
            isLoading={samletFremdrift.isLoading}
            farve="bg-steel"
          />
        </div>
      </section>

      <section className="panel mt-6 p-6 sm:p-8">
        <p className="label-mono tracking-[0.18em]">I dag i kalenderen</p>
        {kalenderIDag.isLoading ? (
          <p className="mt-3 text-sm text-ink-soft">Indlæser kalender…</p>
        ) : !kalenderIDag.data ? (
          <p className="mt-3 text-sm text-ink-soft">Kunne ikke indlæse kalenderen.</p>
        ) : !kalenderIDag.data.harKalender ? (
          <p className="mt-3 text-sm text-ink-soft">
            Ingen kalender tilknyttet endnu.{" "}
            <Link
              to="/kalender"
              className="font-medium text-steel underline-offset-4 hover:underline"
            >
              Kom i gang på Kalender-siden
            </Link>
            .
          </p>
        ) : begivenhederIDag.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Ingen skemalagte timer i dag.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {begivenhederIDag.map((b) => (
              <li
                key={`${b.fagId}-${b.start}`}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span className="label-mono normal-case tracking-normal text-ink-soft">
                  {formatKlokkeslaet(b.start)}–{formatKlokkeslaet(b.slut)}
                </span>
                <span className="font-medium">{b.fagNavn}</span>
                <span className="text-ink-soft">{b.type}</span>
                <span className="text-ink-soft">· {b.lokale ?? "Online"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel mt-6 p-6 sm:p-8">
        <p className="label-mono tracking-[0.18em]">Kommende afleveringer</p>
        {canvasOpgaver.isLoading ? (
          <p className="mt-3 text-sm text-ink-soft">Indlæser opgaver…</p>
        ) : !canvasOpgaver.data?.harToken ? (
          <p className="mt-3 text-sm text-ink-soft">
            <Link
              to="/kalender"
              className="font-medium text-steel underline-offset-4 hover:underline"
            >
              Tilknyt Canvas-token
            </Link>{" "}
            for at se kommende afleveringer.
          </p>
        ) : kommendeOpgaver.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Ingen kommende afleveringer — godt gået!
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {kommendeOpgaver.map((o) => (
              <li
                key={o.canvas_assignment_id}
                className="flex items-baseline justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.titel}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {o.fag?.navn ?? "Ukendt fag"}
                    {o.missing && <span className="ml-2 text-clay">· Mangler</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="label-mono normal-case tracking-normal text-ink-soft">
                    {o.forfaldsdato
                      ? new Date(o.forfaldsdato).toLocaleDateString("da-DK", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Ingen dato"}
                  </span>
                  {o.url_til_canvas && (
                    <a
                      href={o.url_til_canvas}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="label-mono shrink-0 rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal text-steel hover:bg-steel/20"
                    >
                      Åbn
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="label-mono">Eksport</p>
          <p className="mt-1 text-sm text-ink-soft">
            Saml fag, forelæsninger, litteratur og begreber i ét dokument.
          </p>
        </div>
        <button
          onClick={haandterPdfEksport}
          className="label-mono shrink-0 rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal"
        >
          Eksportér som PDF
        </button>
      </div>

      <div className="mb-4 mt-8 flex items-baseline justify-between">
        <h2 className="label-mono font-semibold">Fag i semesteret</h2>
        <span className="text-xs text-ink-soft">
          {(fag.data ?? []).length} fag · {samletEcts} ECTS
        </span>
      </div>

      {fag.isLoading ? (
        <p className="text-sm text-ink-soft">Indlæser fag…</p>
      ) : (fag.data ?? []).length === 0 ? (
        <p className="text-sm text-ink-soft">Der er endnu ingen fag oprettet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(fag.data ?? []).map((f, i) => (
            <FagKort key={f.id} fag={f} farve={barFarver[i % barFarver.length]!} />
          ))}
        </div>
      )}
    </>
  );
}

function FagKort({ fag: f, farve }: { fag: Fag; farve: string }) {
  const fremdrift = useQuery({
    queryKey: ["forelaesningsFremdrift", f.id],
    queryFn: () => hentForelaesningsFremdrift(f.id),
  });

  return (
    <Link
      to="/fag/$fagId"
      params={{ fagId: f.id }}
      className="panel block p-5 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold leading-tight tracking-tight">
          {f.navn}
        </h3>
        {f.eksamensform && (
          <span className="label-mono shrink-0 rounded-lg bg-steel-soft px-2 py-1 normal-case tracking-normal text-steel">
            {f.eksamensform}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {Number(f.ects)} ECTS
        {f.eksamensperiode ? ` · Eksamen ${f.eksamensperiode}` : ""}
      </p>
      <div className="mt-4">
        <FremdriftVisning fremdrift={fremdrift.data} isLoading={fremdrift.isLoading} farve={farve} />
      </div>
    </Link>
  );
}
