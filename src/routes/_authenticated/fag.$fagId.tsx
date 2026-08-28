import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatDato,
  hentFag,
  hentForelaesninger,
  hentLitteratur,
  hentMinFremgang,
  saetStatus,
  statusFarve,
  STATUSSER,
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
  const fremgang = useQuery({ queryKey: ["fremgang"], queryFn: hentMinFremgang });

  const opdater = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => saetStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fremgang"] }),
  });

  const detteFag = (fag.data ?? []).find((f) => f.id === fagId);
  const statusFor = (id: string) =>
    (fremgang.data ?? []).find((f) => f.forelaesning_id === id)?.status ?? "ikke startet";

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
      </section>

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
            <div
              key={fl.id}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
            >
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
                {fl.note_url ? (
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
