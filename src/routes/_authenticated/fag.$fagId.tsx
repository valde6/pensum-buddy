import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  formatDato,
  formatEksamensdato,
  formatTidspunkt,
  hentCanvasOpgaverForFag,
  hentEksamener,
  hentEksamensopgaver,
  hentFag,
  hentForelaesninger,
  hentForelaesningsFremdrift,
  hentKommentarer,
  hentLektionsplan,
  hentLitteratur,
  hentMinFremgang,
  saetStatus,
  statusFarve,
  STATUSSER,
  syncCanvasOpgaver,
  tilfoejKommentar,
  type FremdriftTal,
  type Kommentar,
  type Status,
} from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/fag/$fagId")({
  head: () => ({
    meta: [
      { title: "Fag — Pensummit" },
      {
        name: "description",
        content:
          "Forelæsninger, noter, litteratur og din egen status for et enkelt fag på semesteret.",
      },
      { property: "og:title", content: "Fag — Pensummit" },
      {
        property: "og:description",
        content: "Se forelæsninger, åbn noter og markér din status for faget.",
      },
    ],
  }),
  component: FagSide,
});

// Kompakt, ét-linjes fremgangsbjælke med label — bruges kun i fag-headeren.
// Lever lokalt her frem for i den delte FremdriftVisning, som altid viser
// begge spor stablet og derfor ikke passer til dette kompakte layout.
function Fremgangsbjaelke({
  label,
  tal,
  farve = "bg-steel",
}: {
  label: string;
  tal: FremdriftTal;
  farve?: string;
}) {
  const pct = tal.total === 0 ? 0 : Math.round((tal.forbi / tal.total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>{label}</span>
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

function FagSide() {
  const { fagId } = Route.useParams();
  const queryClient = useQueryClient();
  const [visAlleOpgaverFag, setVisAlleOpgaverFag] = useState(false);

  useEffect(() => {
    syncCanvasOpgaver()
      .then(() => queryClient.invalidateQueries({ queryKey: ["canvasOpgaver"] }))
      .catch(console.error);
  }, [queryClient]);

  const fag = useQuery({ queryKey: ["fag"], queryFn: hentFag });
  const forelaesninger = useQuery({
    queryKey: ["forelaesning", fagId],
    queryFn: () => hentForelaesninger(fagId),
  });
  const litteratur = useQuery({
    queryKey: ["litteratur", fagId],
    queryFn: () => hentLitteratur(fagId),
  });
  const eksamener = useQuery({
    queryKey: ["eksamen", fagId],
    queryFn: () => hentEksamener(fagId),
  });
  const eksamensopgaver = useQuery({
    queryKey: ["eksamensopgave"],
    queryFn: hentEksamensopgaver,
  });
  const lektionsplan = useQuery({
    queryKey: ["lektionsplan", fagId],
    queryFn: () => hentLektionsplan(fagId),
  });
  const canvasOpgaver = useQuery({
    queryKey: ["canvasOpgaver", fagId],
    queryFn: () => hentCanvasOpgaverForFag(fagId),
  });
  const fremgang = useQuery({ queryKey: ["fremgang"], queryFn: hentMinFremgang });
  const kommentarer = useQuery({ queryKey: ["kommentar"], queryFn: hentKommentarer });
  const fremdrift = useQuery({
    queryKey: ["forelaesningsFremdrift", fagId],
    queryFn: () => hentForelaesningsFremdrift(fagId),
  });

  const opdater = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => saetStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fremgang"] }),
  });

  const tilfoejKommentarMutation = useMutation({
    mutationFn: ({ forelaesningId, tekst }: { forelaesningId: string; tekst: string }) =>
      tilfoejKommentar(forelaesningId, tekst),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kommentar"] }),
  });

  const tilfoejOpgaveKommentarMutation = useMutation({
    mutationFn: ({ opgaveId, tekst }: { opgaveId: string; tekst: string }) =>
      tilfoejKommentar(undefined, tekst, opgaveId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kommentar"] }),
  });

  const detteFag = (fag.data ?? []).find((f) => f.id === fagId);
  const statusFor = (id: string) =>
    (fremgang.data ?? []).find((f) => f.forelaesning_id === id)?.status ?? "ikke startet";
  const kommentarerFor = (id: string) =>
    (kommentarer.data ?? []).filter((k) => k.forelaesning_id === id);
  const eksamensopgaverFor = (eksamenId: string) =>
    (eksamensopgaver.data ?? []).filter((o) => o.eksamen_id === eksamenId);
  const opgaveKommentarerFor = (id: string) =>
    (kommentarer.data ?? []).filter((k) => k.canvas_opgave_id === id);
  const fagOpgaver = canvasOpgaver.data ?? [];
  const visteFagOpgaver = visAlleOpgaverFag ? fagOpgaver : fagOpgaver.slice(0, 1);
  const antalUafleveret = fagOpgaver.filter(
    (o) => o.submission_state !== "submitted" && o.submission_state !== "graded",
  ).length;

  // Chips i headeren: nærmeste eksamen, næste ikke-afleverede opgave, og en
  // eventuel forelæsning i dag — samme "nærmeste/kommende"-logik som dashboardet.
  const naesteEksamenForFag = (eksamener.data ?? [])
    .filter((e) => e.dato && new Date(e.dato).getTime() > Date.now())
    .sort((a, b) => (a.dato! < b.dato! ? -1 : 1))[0];
  const naesteOpgaveForFag = fagOpgaver
    .filter(
      (o) =>
        o.submission_state !== "submitted" &&
        o.submission_state !== "graded" &&
        o.forfaldsdato &&
        new Date(o.forfaldsdato).getTime() > Date.now(),
    )
    .sort((a, b) => (a.forfaldsdato! < b.forfaldsdato! ? -1 : 1))[0];
  const idagDatoStreng = new Date().toISOString().slice(0, 10);
  const forelaesningIDag = (forelaesninger.data ?? []).find((fl) => fl.dato === idagDatoStreng);

  const chipKlasse =
    "label-mono rounded-full border border-line bg-surface px-3 py-1 text-xs normal-case tracking-normal";

  return (
    <>
      <Link to="/dashboard" className="label-mono hover:text-ink">
        ← Dashboard
      </Link>

      {/* SEKTION A — Fag-header */}
      <section
        className="panel mt-4 border-l-4 p-6 sm:p-8"
        style={{ borderColor: detteFag?.farve ?? "var(--steel)" }}
      >
        <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
          {detteFag?.navn ?? "Fag"}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {naesteEksamenForFag && (
            <span className={chipKlasse}>
              Eksamen: {naesteEksamenForFag.navn ?? "Eksamen"} ·{" "}
              {formatEksamensdato(naesteEksamenForFag.dato)}
            </span>
          )}
          {naesteOpgaveForFag && (
            <span className={chipKlasse}>
              Næste opgave: {naesteOpgaveForFag.titel}
              {naesteOpgaveForFag.forfaldsdato
                ? ` · ${formatDato(naesteOpgaveForFag.forfaldsdato)}`
                : ""}
            </span>
          )}
          {forelaesningIDag && (
            <span className={chipKlasse}>Forelæsning i dag: {forelaesningIDag.emne}</span>
          )}
        </div>

        <div className="mt-4">
          {fremdrift.isLoading ? (
            <p className="text-xs text-ink-soft">Indlæser fremdrift…</p>
          ) : !fremdrift.data?.tilknyttet ? (
            <p className="text-xs text-ink-soft">
              <Link
                to="/kalender"
                className="font-medium text-steel underline-offset-4 hover:underline"
              >
                Forbind din kalender
              </Link>{" "}
              for at se fremdrift
            </p>
          ) : (
            <div className="space-y-3">
              <Fremgangsbjaelke label="Forelæsninger" tal={fremdrift.data.forelaesninger} />
              <Fremgangsbjaelke
                label="Øvelsestimer"
                tal={fremdrift.data.ovelser}
                farve="bg-sage"
              />
            </div>
          )}
        </div>
      </section>

      {/* SEKTION B — Forelæsningsliste */}
      <h2 className="label-mono mb-4 mt-10 font-semibold">Forelæsninger</h2>
      <div className="panel divide-y divide-line overflow-hidden">
        {(forelaesninger.data ?? []).length === 0 && (
          <p className="px-5 py-6 text-sm text-ink-soft">
            Ingen forelæsninger er tilføjet til faget endnu.
          </p>
        )}
        {(forelaesninger.data ?? []).map((fl) => {
          const status = statusFor(fl.id);
          return (
            <div key={fl.id} className="px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper font-mono text-sm ring-1 ring-line">
                    {String(fl.nummer).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{fl.emne}</p>
                    <p className="label-mono mt-0.5 normal-case tracking-normal">
                      {formatDato(fl.dato)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {fl.note_html ? (
                    <Link
                      to="/fag/$fagId/noter/$forelaesningId"
                      params={{ fagId, forelaesningId: fl.id }}
                      className="text-sm font-medium text-steel underline-offset-4 hover:underline"
                    >
                      Åbn note
                    </Link>
                  ) : fl.note_url ? (
                    <a
                      href={fl.note_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-steel underline-offset-4 hover:underline"
                    >
                      Åbn note
                    </a>
                  ) : (
                    <span className="text-sm text-ink-soft">Ingen note</span>
                  )}
                  <select
                    value={status}
                    onChange={(e) =>
                      opdater.mutate({ id: fl.id, status: e.target.value as Status })
                    }
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${statusFarve(status)}`}
                  >
                    {STATUSSER.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <KommentarTraad
                kommentarer={kommentarerFor(fl.id)}
                gemmer={tilfoejKommentarMutation.isPending}
                onTilfoej={(tekst) =>
                  tilfoejKommentarMutation.mutate({ forelaesningId: fl.id, tekst })
                }
              />
            </div>
          );
        })}
      </div>

      {/* SEKTION C — Kollaps-sektion */}
      <div className="panel mt-6 divide-y divide-line">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-medium marker:content-[''] [&::-webkit-details-marker]:hidden">
            Eksamen
            <span className="text-ink-soft transition-transform group-open:rotate-180">→</span>
          </summary>
          <div className="px-6 pb-6">
            {eksamener.isLoading ? (
              <p className="text-sm text-ink-soft">Indlæser eksamen…</p>
            ) : (eksamener.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">Ingen eksamen registreret endnu.</p>
            ) : (
              <ul className="space-y-3">
                {(eksamener.data ?? []).map((e) => {
                  const opgaver = eksamensopgaverFor(e.id);
                  const indhold = (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{e.navn ?? "Eksamen"}</p>
                        <p className="mt-0.5 text-sm text-ink-soft">
                          {formatEksamensdato(e.dato)}
                        </p>
                      </div>
                      {e.vaegt != null && (
                        <span className="label-mono shrink-0 rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal text-steel">
                          {e.vaegt}%
                        </span>
                      )}
                    </div>
                  );

                  if (opgaver.length === 0) {
                    return <li key={e.id}>{indhold}</li>;
                  }

                  return (
                    <li key={e.id}>
                      <details className="group/opgaver">
                        <summary className="cursor-pointer list-none marker:content-[''] [&::-webkit-details-marker]:hidden">
                          {indhold}
                          <p className="mt-1 text-xs text-ink-soft">
                            Se eksempler på opgaver{" "}
                            <span className="group-open/opgaver:hidden">→</span>
                            <span className="hidden group-open/opgaver:inline">↓</span>
                          </p>
                        </summary>
                        <div className="mt-4 space-y-6 border-t border-line pt-4">
                          {opgaver.map((o) => (
                            <div key={o.id}>
                              <p className="font-medium">{o.titel}</p>
                              <p className="label-mono mt-0.5 normal-case tracking-normal">
                                {[o.periode, o.proeveform].filter(Boolean).join(" · ") || "—"}
                              </p>
                              <ul className="mt-3 space-y-3">
                                {o.dele.map((d) => (
                                  <li
                                    key={d.id}
                                    className="border-t border-line pt-3 first:border-t-0 first:pt-0"
                                  >
                                    <p className="text-sm font-medium">
                                      Opgave {d.nummer} ({d.vaegt ?? "—"}%): {d.emne}
                                    </p>
                                    {d.beskrivelse && (
                                      <p className="mt-1 text-sm text-ink-soft">
                                        {d.beskrivelse}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
            {detteFag?.eksamensdetaljer && (
              <div className="mt-6 space-y-3 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
                <p className="label-mono text-ink-soft">Eksamen i detaljer</p>
                {splitAfsnit(detteFag.eksamensdetaljer).map((afsnit, i) => (
                  <p key={i}>{afsnit}</p>
                ))}
              </div>
            )}
          </div>
        </details>

        {fagOpgaver.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-medium marker:content-[''] [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                Obligatoriske opgaver
                {antalUafleveret > 0 && (
                  <span className="label-mono rounded-full bg-clay/20 px-2 py-0.5 text-[10px] normal-case tracking-normal text-clay">
                    {antalUafleveret}
                  </span>
                )}
              </span>
              <span className="text-ink-soft transition-transform group-open:rotate-180">→</span>
            </summary>
            <div className="px-6 pb-6">
              <div className="divide-y divide-line">
                {visteFagOpgaver.map((o) => (
                  <div key={o.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{o.titel}</p>
                        <p className="label-mono mt-1 normal-case tracking-normal text-ink-soft">
                          Aflevering:{" "}
                          {o.forfaldsdato
                            ? new Date(o.forfaldsdato).toLocaleDateString("da-DK", {
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Ingen dato"}
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
                            className="label-mono rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal text-steel hover:bg-steel/20"
                          >
                            Åbn i Canvas
                          </a>
                        )}
                      </div>
                    </div>
                    <KommentarTraad
                      kommentarer={opgaveKommentarerFor(o.id)}
                      gemmer={tilfoejOpgaveKommentarMutation.isPending}
                      onTilfoej={(tekst) =>
                        tilfoejOpgaveKommentarMutation.mutate({ opgaveId: o.id, tekst })
                      }
                    />
                  </div>
                ))}
              </div>
              {fagOpgaver.length > 1 && (
                <button
                  onClick={() => setVisAlleOpgaverFag((v) => !v)}
                  className="mt-3 text-sm font-medium text-steel underline-offset-4 hover:underline"
                >
                  {visAlleOpgaverFag ? "Vis færre" : `Vis alle ${fagOpgaver.length} opgaver`}
                </button>
              )}
            </div>
          </details>
        )}

        {detteFag && (detteFag.laeringsmaal || detteFag.kursusindhold) && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-medium marker:content-[''] [&::-webkit-details-marker]:hidden">
              Læringsmål & kursets indhold
              <span className="text-ink-soft transition-transform group-open:rotate-180">→</span>
            </summary>
            <div className="space-y-6 px-6 pb-6">
              {detteFag.laeringsmaal && (
                <div>
                  <p className="label-mono mb-2">Læringsmål</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
                    {splitPunkter(detteFag.laeringsmaal).map((punkt, i) => (
                      <li key={i}>{punkt}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detteFag.kursusindhold && (
                <div>
                  <p className="label-mono mb-2">Kursets indhold</p>
                  <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
                    {splitAfsnit(detteFag.kursusindhold).map((afsnit, i) => (
                      <p key={i}>{afsnit}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}

        {(lektionsplan.data ?? []).length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-medium marker:content-[''] [&::-webkit-details-marker]:hidden">
              Undervisningsplan
              <span className="text-ink-soft transition-transform group-open:rotate-180">→</span>
            </summary>
            <div className="divide-y divide-line border-t border-line px-6 pb-6">
              {(lektionsplan.data ?? []).map((l) => {
                const tidsInfo = [l.uge, l.dato ? formatDato(l.dato) : null, l.tidspunkt]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div key={l.id} className="py-3 first:pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{l.titel}</p>
                        {l.type && (
                          <span className="label-mono rounded-full bg-steel-soft px-2 py-0.5 normal-case tracking-normal text-steel">
                            {l.type}
                          </span>
                        )}
                        {l.laeringsmaal && (
                          <span className="label-mono rounded-full bg-sage-soft px-2 py-0.5 normal-case tracking-normal text-sage">
                            {l.laeringsmaal}
                          </span>
                        )}
                      </div>
                      {tidsInfo && (
                        <p className="label-mono shrink-0 normal-case tracking-normal text-ink-soft">
                          {tidsInfo}
                        </p>
                      )}
                    </div>
                    {l.underviser && (
                      <p className="mt-1 text-sm text-ink-soft">Underviser: {l.underviser}</p>
                    )}
                    {l.formaal && <p className="mt-1 text-sm text-ink-soft">{l.formaal}</p>}
                    {l.pensum && <p className="mt-1 text-sm text-ink-soft">Pensum: {l.pensum}</p>}
                  </div>
                );
              })}
            </div>
          </details>
        )}

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-medium marker:content-[''] [&::-webkit-details-marker]:hidden">
            Litteratur
            <span className="text-ink-soft transition-transform group-open:rotate-180">→</span>
          </summary>
          <div className="px-6 pb-6">
            {(litteratur.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">Ingen litteratur registreret.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(litteratur.data ?? []).map((l) => (
                  <div key={l.id} className="panel p-5">
                    <p className="label-mono text-clay">{l.type ?? "kilde"}</p>
                    <p className="mt-1 font-display text-lg font-semibold leading-snug tracking-tight">
                      {l.titel}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">{l.forfatter ?? "—"}</p>
                    {l.url && (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-steel underline-offset-4 hover:underline"
                      >
                        Åbn link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </>
  );
}

function splitAfsnit(tekst: string) {
  return tekst
    .split(/\n\s*\n/)
    .map((afsnit) => afsnit.trim())
    .filter(Boolean);
}

function splitPunkter(tekst: string) {
  return tekst
    .split("\n")
    .map((linje) => linje.trim())
    .filter(Boolean)
    .map((linje) => (linje.startsWith("- ") ? linje.slice(2) : linje));
}

function KommentarTraad({
  kommentarer,
  gemmer,
  onTilfoej,
}: {
  kommentarer: Kommentar[];
  gemmer: boolean;
  onTilfoej: (tekst: string) => void;
}) {
  const [tekst, setTekst] = useState("");

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <p className="label-mono">Kommentarer</p>
      <div className="space-y-2">
        {kommentarer.length === 0 && (
          <p className="text-sm text-ink-soft">Ingen kommentarer endnu.</p>
        )}
        {kommentarer.map((k) => (
          <div key={k.id} className="text-sm">
            <span className="label-mono normal-case tracking-normal text-ink-soft">
              {formatTidspunkt(k.oprettet_dato)}
            </span>
            <p className="mt-0.5">{k.tekst}</p>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = tekst.trim();
          if (!v) return;
          onTilfoej(v);
          setTekst("");
        }}
        className="flex gap-2"
      >
        <input
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Skriv en kommentar…"
          className="flex-1 rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40"
        />
        <button
          type="submit"
          disabled={gemmer || !tekst.trim()}
          className="label-mono shrink-0 rounded-full bg-steel-soft px-3 py-2 normal-case tracking-normal disabled:opacity-60"
        >
          Tilføj
        </button>
      </form>
    </div>
  );
}
