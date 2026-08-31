import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  formatDato,
  formatEksamensdato,
  formatTidspunkt,
  hentEksamener,
  hentFag,
  hentForelaesninger,
  hentForelaesningsFremdrift,
  hentKommentarer,
  hentLitteratur,
  hentMinFremgang,
  saetStatus,
  statusFarve,
  STATUSSER,
  tilfoejKommentar,
  type Kommentar,
  type Status,
} from "@/lib/pensum";
import { FremdriftVisning } from "@/components/FremdriftVisning";

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

function FagSide() {
  const { fagId } = Route.useParams();
  const queryClient = useQueryClient();

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

  const detteFag = (fag.data ?? []).find((f) => f.id === fagId);
  const statusFor = (id: string) =>
    (fremgang.data ?? []).find((f) => f.forelaesning_id === id)?.status ?? "ikke startet";
  const kommentarerFor = (id: string) =>
    (kommentarer.data ?? []).filter((k) => k.forelaesning_id === id);

  return (
    <>
      <Link to="/dashboard" className="label-mono hover:text-ink">
        ← Dashboard
      </Link>

      <section className="panel mt-4 p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
          {detteFag?.navn ?? "Fag"}
        </h1>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="label-mono">ECTS</dt>
            <dd className="mt-1 text-base">{Number(detteFag?.ects ?? 0)}</dd>
          </div>
          <div>
            <dt className="label-mono">Eksamensform</dt>
            <dd className="mt-1 text-base">{detteFag?.eksamensform ?? "—"}</dd>
          </div>
          <div>
            <dt className="label-mono">Eksamensperiode</dt>
            <dd className="mt-1 text-base">{detteFag?.eksamensperiode ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <FremdriftVisning fremdrift={fremdrift.data} isLoading={fremdrift.isLoading} />
        </div>
      </section>

      <section className="panel mt-6 p-6 sm:p-8">
        <h2 className="label-mono mb-3 font-semibold">Eksamen</h2>
        {eksamener.isLoading ? (
          <p className="text-sm text-ink-soft">Indlæser eksamen…</p>
        ) : (eksamener.data ?? []).length === 0 ? (
          <p className="text-sm text-ink-soft">Ingen eksamen registreret endnu.</p>
        ) : (
          <ul className="space-y-3">
            {(eksamener.data ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{e.navn ?? "Eksamen"}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{formatEksamensdato(e.dato)}</p>
                </div>
                {e.vaegt != null && (
                  <span className="label-mono shrink-0 rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal text-steel">
                    {e.vaegt}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {detteFag &&
        (detteFag.eksamensdetaljer || detteFag.laeringsmaal || detteFag.kursusindhold) && (
          <div className="mt-6 space-y-4">
            {detteFag.eksamensdetaljer && (
              <section className="panel p-6 sm:p-8">
                <h2 className="label-mono mb-3 font-semibold">Eksamen i detaljer</h2>
                <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
                  {splitAfsnit(detteFag.eksamensdetaljer).map((afsnit, i) => (
                    <p key={i}>{afsnit}</p>
                  ))}
                </div>
              </section>
            )}
            {detteFag.laeringsmaal && (
              <section className="panel p-6 sm:p-8">
                <h2 className="label-mono mb-3 font-semibold">Læringsmål</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
                  {splitPunkter(detteFag.laeringsmaal).map((punkt, i) => (
                    <li key={i}>{punkt}</li>
                  ))}
                </ul>
              </section>
            )}
            {detteFag.kursusindhold && (
              <section className="panel p-6 sm:p-8">
                <h2 className="label-mono mb-3 font-semibold">Kursets indhold</h2>
                <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
                  {splitAfsnit(detteFag.kursusindhold).map((afsnit, i) => (
                    <p key={i}>{afsnit}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

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

      <h2 className="label-mono mb-4 mt-10 font-semibold">Litteratur</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(litteratur.data ?? []).length === 0 && (
          <p className="text-sm text-ink-soft">Ingen litteratur registreret.</p>
        )}
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
