import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  hentBegreber,
  hentFag,
  hentMinRepetition,
  saetRepetition,
  vaelgNaesteBegreb,
} from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/repetition")({
  head: () => ({
    meta: [
      { title: "Repetition — Pensummit" },
      {
        name: "description",
        content: "Repetér semesterets begreber ét ad gangen som simple flashcards.",
      },
      { property: "og:title", content: "Repetition — Pensummit" },
      {
        property: "og:description",
        content: "Se et begreb, gæt definitionen, vis svaret, og markér om du kunne den.",
      },
    ],
  }),
  component: RepetitionSide,
});

function RepetitionSide() {
  const queryClient = useQueryClient();
  const [visSvar, setVisSvar] = useState(false);

  const fag = useQuery({ queryKey: ["fag"], queryFn: hentFag });
  const begreber = useQuery({ queryKey: ["begreb"], queryFn: hentBegreber });
  const repetition = useQuery({ queryKey: ["begreb_repetition"], queryFn: hentMinRepetition });

  const svar = useMutation({
    mutationFn: ({ begrebId, kunneDen }: { begrebId: string; kunneDen: boolean }) =>
      saetRepetition(begrebId, kunneDen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["begreb_repetition"] });
      setVisSvar(false);
    },
  });

  return (
    <>
      <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
        Repetition
      </h1>
      <p className="mt-3 max-w-[52ch] text-base text-ink-soft">
        Gæt definitionen, vis svaret, og markér om du kunne den.
      </p>

      {begreber.isLoading || repetition.isLoading ? (
        <p className="mt-6 text-sm text-ink-soft">Indlæser begreber…</p>
      ) : (
        (() => {
          const naeste = vaelgNaesteBegreb(begreber.data ?? [], repetition.data ?? []);
          if (!naeste) {
            return (
              <p className="mt-6 text-sm text-ink-soft">
                Der er endnu ingen begreber at repetere.
              </p>
            );
          }

          const fagNavn = (fag.data ?? []).find((f) => f.id === naeste.fag_id)?.navn;

          return (
            <>
              <div className="panel mt-6 p-8 text-center">
                <p className="label-mono">{fagNavn ?? "—"}</p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
                  {naeste.navn}
                </h2>

                {visSvar ? (
                  <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-ink-soft">
                    {naeste.definition ?? "Ingen definition registreret."}
                  </p>
                ) : (
                  <button
                    onClick={() => setVisSvar(true)}
                    className="label-mono mt-6 rounded-full bg-steel-soft px-4 py-2 normal-case tracking-normal"
                  >
                    Vis svar
                  </button>
                )}

                {visSvar && (
                  <div className="mt-8 flex justify-center gap-3">
                    <button
                      onClick={() => svar.mutate({ begrebId: naeste.id, kunneDen: false })}
                      disabled={svar.isPending}
                      className="label-mono rounded-full bg-clay-soft px-4 py-2 normal-case tracking-normal text-clay disabled:opacity-60"
                    >
                      Skal øves igen
                    </button>
                    <button
                      onClick={() => svar.mutate({ begrebId: naeste.id, kunneDen: true })}
                      disabled={svar.isPending}
                      className="label-mono rounded-full bg-sage-soft px-4 py-2 normal-case tracking-normal text-sage disabled:opacity-60"
                    >
                      Kunne den
                    </button>
                  </div>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-ink-soft">
                {(repetition.data ?? []).length} / {(begreber.data ?? []).length} begreber
                repeteret mindst én gang
              </p>
            </>
          );
        })()
      )}
    </>
  );
}
