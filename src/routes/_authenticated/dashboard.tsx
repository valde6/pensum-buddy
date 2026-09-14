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
  type FremdriftTal,
} from "@/lib/pensum";
import { eksporterPensumSomPdf } from "@/lib/pensumPdf";

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

// Kompakt fremgangsbjælke — bruges flere steder med forskellige layouts
// (side om side i hero'et, label-løs i fagkort), så den lever lokalt her
// i stedet for at ændre den delte FremdriftVisning (som ikke understøtter
// disse layouts).
function Fremgangsbjaelke({
  label,
  tal,
  farve = "bg-steel",
}: {
  label?: string;
  tal: FremdriftTal;
  farve?: string;
}) {
  const pct = tal.total === 0 ? 0 : Math.round((tal.forbi / tal.total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>{label ?? ""}</span>
        <span className="font-mono">
          {tal.forbi} / {tal.total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${farve}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Fremdriftstilstand({
  isLoading,
  tilknyttet,
}: {
  isLoading: boolean;
  tilknyttet: boolean;
}) {
  if (isLoading) return <p className="text-xs text-ink-soft">Indlæser fremdrift…</p>;
  if (!tilknyttet) {
    return (
      <p className="text-xs text-ink-soft">
        <Link to="/kalender" className="font-medium text-steel underline-offset-4 hover:underline">
          Forbind din kalender
        </Link>{" "}
        for at se fremdrift
      </p>
    );
  }
  return null;
}

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

  const iDagTekst = kalenderIDag.isLoading
    ? "Indlæser kalender…"
    : !kalenderIDag.data?.harKalender
      ? "Ingen kalender tilknyttet"
      : begivenhederIDag.length === 0
        ? "Ingen skemalagte timer"
        : begivenhederIDag.map((b) => `${b.fagNavn} kl. ${formatKlokkeslaet(b.start)}`).join(", ");

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
        .slice(0, 3)
    : [];

  return (
    <>
      {/* SEKTION A — Hero */}
      <section className="rounded-2xl border border-steel/20 bg-steel/10 p-8">
        {naesteEksamen ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <p className="label-mono self-center normal-case tracking-normal">
                {naesteEksamenFag?.navn ?? "Fag"}
              </p>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="font-display text-6xl font-bold text-steel">
                    {dageTil(naesteEksamen.dato!)}
                  </p>
                  <p className="label-mono mt-1 text-ink-soft">Dage</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-6xl font-bold text-steel">
                    {Math.ceil(dageTil(naesteEksamen.dato!) / 7)}
                  </p>
                  <p className="label-mono mt-1 text-ink-soft">Uger</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {naesteEksamen.navn ?? "Eksamen"} · {formatDato(naesteEksamen.dato)}
            </p>
          </>
        ) : (
          <p className="text-base text-ink-soft">
            Ingen kommende eksamensdato er registreret endnu.
          </p>
        )}

        <div className="mt-6">
          <Fremdriftstilstand
            isLoading={samletFremdrift.isLoading}
            tilknyttet={Boolean(samletFremdrift.data?.tilknyttet)}
          />
          {samletFremdrift.data?.tilknyttet && (
            <div className="grid grid-cols-2 gap-6">
              <Fremgangsbjaelke label="Forelæsninger" tal={samletFremdrift.data.forelaesninger} />
              <Fremgangsbjaelke label="Øvelsestimer" tal={samletFremdrift.data.ovelser} />
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-ink-soft">I dag: {iDagTekst}</p>
      </section>

      {/* SEKTION B — 2-kolonne grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="panel p-6 sm:p-8">
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
        </div>

        <div className="panel p-6 sm:p-8">
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
        </div>
      </div>

      {/* SEKTION C — Fagkort */}
      <div className="mb-3 mt-8 flex items-baseline justify-between">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(fag.data ?? []).map((f) => (
            <FagKort key={f.id} fag={f} />
          ))}
        </div>
      )}

      {/* SEKTION D — Eksport */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={haandterPdfEksport}
          className="label-mono rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal"
        >
          Eksportér som PDF
        </button>
      </div>
    </>
  );
}

function FagKort({ fag: f }: { fag: Fag }) {
  const fremdrift = useQuery({
    queryKey: ["forelaesningsFremdrift", f.id],
    queryFn: () => hentForelaesningsFremdrift(f.id),
  });

  return (
    <Link
      to="/fag/$fagId"
      params={{ fagId: f.id }}
      className="panel block border-l-4 p-5 transition-shadow hover:shadow-sm"
      style={{ borderColor: f.farve ?? "var(--steel)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-tight tracking-tight">{f.navn}</h3>
        {f.eksamensform && (
          <span className="label-mono shrink-0 rounded-full bg-steel-soft px-2 py-0.5 text-[10px] normal-case tracking-normal text-steel">
            {f.eksamensform}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {Number(f.ects)} ECTS
        {f.eksamensperiode ? ` · Eksamen ${f.eksamensperiode}` : ""}
      </p>
      <div className="mt-3 space-y-2">
        <Fremdriftstilstand
          isLoading={fremdrift.isLoading}
          tilknyttet={Boolean(fremdrift.data?.tilknyttet)}
        />
        {fremdrift.data?.tilknyttet && (
          <>
            <Fremgangsbjaelke tal={fremdrift.data.forelaesninger} />
            <Fremgangsbjaelke tal={fremdrift.data.ovelser} />
          </>
        )}
      </div>
    </Link>
  );
}
