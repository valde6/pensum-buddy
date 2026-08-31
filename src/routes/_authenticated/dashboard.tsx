import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  dageTil,
  formatDato,
  formatKlokkeslaet,
  hentBegreber,
  hentFag,
  hentForelaesninger,
  hentKalenderFra,
  hentLitteratur,
  hentMinFremgang,
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

const barFarver = ["bg-steel", "bg-sage", "bg-clay"];

function Dashboard() {
  const fag = useQuery({ queryKey: ["fag"], queryFn: hentFag });
  const forelaesninger = useQuery({
    queryKey: ["forelaesning"],
    queryFn: () => hentForelaesninger(),
  });
  const fremgang = useQuery({ queryKey: ["fremgang"], queryFn: hentMinFremgang });
  const litteratur = useQuery({ queryKey: ["litteratur"], queryFn: () => hentLitteratur() });
  const begreber = useQuery({ queryKey: ["begreb"], queryFn: hentBegreber });

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

  const gennemgaaede = new Set(
    (fremgang.data ?? [])
      .filter((f) => f.status === "gennemgået" || f.status === "repeteret")
      .map((f) => f.forelaesning_id),
  );

  const naesteEksamen = (fag.data ?? [])
    .filter((f) => f.eksamensdato && new Date(f.eksamensdato).getTime() > Date.now())
    .sort((a, b) => (a.eksamensdato! < b.eksamensdato! ? -1 : 1))[0];

  const samletEcts = (fag.data ?? []).reduce((sum, f) => sum + Number(f.ects ?? 0), 0);

  return (
    <>
      <section className="panel p-6 sm:p-8">
        {naesteEksamen ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-mono tracking-[0.18em]">Nærmeste eksamen</p>
              <h1 className="mt-3 max-w-[28ch] font-display text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
                {naesteEksamen.navn}
              </h1>
              <p className="mt-3 max-w-[42ch] text-base text-ink-soft">
                {naesteEksamen.eksamensform ?? "Eksamen"} ·{" "}
                {formatDato(naesteEksamen.eksamensdato)}
              </p>
            </div>
            <div className="flex shrink-0 items-stretch gap-3">
              <div className="rounded-xl bg-steel-soft px-5 py-4 text-center">
                <p className="font-display text-4xl font-semibold leading-none text-steel">
                  {dageTil(naesteEksamen.eksamensdato!)}
                </p>
                <p className="label-mono mt-1">Dage</p>
              </div>
              <div className="rounded-xl bg-steel-soft px-5 py-4 text-center">
                <p className="font-display text-4xl font-semibold leading-none text-steel">
                  {Math.ceil(dageTil(naesteEksamen.eksamensdato!) / 7)}
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
          {(fag.data ?? []).map((f, i) => {
            const fagsForelaesninger = (forelaesninger.data ?? []).filter(
              (fl) => fl.fag_id === f.id,
            );
            const antal = fagsForelaesninger.length;
            const klar = fagsForelaesninger.filter((fl) => gennemgaaede.has(fl.id)).length;
            const pct = antal === 0 ? 0 : Math.round((klar / antal) * 100);
            return (
              <Link
                key={f.id}
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
                  <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
                    <span>Dine forelæsninger</span>
                    <span className="font-mono">
                      {klar} / {antal}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full ${barFarver[i % barFarver.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
