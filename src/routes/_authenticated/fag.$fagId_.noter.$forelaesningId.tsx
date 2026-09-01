import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import { formatDato, hentForelaesninger } from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/fag/$fagId_/noter/$forelaesningId")({
  head: () => ({
    meta: [
      { title: "Note — Pensummit" },
      {
        name: "description",
        content: "Læs den genererede HTML-note for en forelæsning.",
      },
    ],
  }),
  component: NoteSide,
});

let mermaidInitialiseret = false;

function sikrMermaidInitialiseret() {
  if (mermaidInitialiseret) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    themeVariables: { fontSize: "16px" },
  });
  mermaidInitialiseret = true;
}

// Gør det statiske quiz-markup fra note_html levende — udelukkende ved at vores
// egen betroede kode læser data-attributter og manipulerer DOM'en efter
// rendering. Der eksekveres aldrig noget fra selve note-indholdet.
function haandterQuizKlik(e: MouseEvent) {
  const target = e.target as HTMLElement;

  const restartKnap = target.closest<HTMLElement>(".quiz-restart");
  if (restartKnap) {
    window.location.reload();
    return;
  }

  const knap = target.closest<HTMLButtonElement>("button.opt");
  if (!knap) return;

  const spoergsmaal = knap.closest<HTMLElement>("[data-quiz-question]");
  if (!spoergsmaal) return;

  const knapper = Array.from(spoergsmaal.querySelectorAll<HTMLButtonElement>("button.opt"));
  if (knapper.some((k) => k.disabled)) return; // allerede besvaret

  const rigtigIdx = Number(spoergsmaal.dataset["correct"]);
  const klikketIdx = Number(knap.dataset["idx"]);

  for (const k of knapper) k.disabled = true;

  const rigtigKnap = knapper.find((k) => Number(k.dataset["idx"]) === rigtigIdx);
  rigtigKnap?.classList.add("correct");
  if (klikketIdx !== rigtigIdx) knap.classList.add("wrong");

  const quizContainer = spoergsmaal.closest<HTMLElement>("[data-quiz]");
  if (!quizContainer) return;

  const alleSpoergsmaal = Array.from(
    quizContainer.querySelectorAll<HTMLElement>("[data-quiz-question]"),
  );
  const besvarede = alleSpoergsmaal.filter((s) =>
    Array.from(s.querySelectorAll<HTMLButtonElement>("button.opt")).some((k) => k.disabled),
  ).length;
  const rigtigeSvar = alleSpoergsmaal.filter((s) => {
    const korrektIdx = s.dataset["correct"];
    return s.querySelector<HTMLButtonElement>(`button.opt[data-idx="${korrektIdx}"].correct`);
  }).length;

  const scoreEl = quizContainer.querySelector(".quiz-score");
  if (scoreEl) {
    scoreEl.textContent = `Score: ${rigtigeSvar} / ${alleSpoergsmaal.length} (${besvarede} besvaret)`;
  }

  if (besvarede === alleSpoergsmaal.length) {
    const restart = quizContainer.querySelector<HTMLElement>(".quiz-restart");
    if (restart) restart.hidden = false;
  }
}

function NoteSide() {
  const { fagId, forelaesningId } = Route.useParams();
  const noteRef = useRef<HTMLDivElement | null>(null);

  const forelaesninger = useQuery({
    queryKey: ["forelaesning", fagId],
    queryFn: () => hentForelaesninger(fagId),
  });

  const forelaesning = (forelaesninger.data ?? []).find((fl) => fl.id === forelaesningId);
  const renHtml = forelaesning?.note_html ? DOMPurify.sanitize(forelaesning.note_html) : null;

  useEffect(() => {
    const container = noteRef.current;
    if (!renHtml || !container) return;

    sikrMermaidInitialiseret();
    mermaid.run({ querySelector: ".mermaid" }).catch(() => {
      // Fejlbehæftet diagram-syntaks skal ikke vælte resten af noten.
    });

    container.addEventListener("click", haandterQuizKlik);
    return () => container.removeEventListener("click", haandterQuizKlik);
  }, [renHtml]);

  return (
    <>
      <Link to="/fag/$fagId" params={{ fagId }} className="label-mono hover:text-ink">
        ← Tilbage til faget
      </Link>

      {forelaesninger.isLoading ? (
        <p className="mt-6 text-sm text-ink-soft">Indlæser note…</p>
      ) : !forelaesning ? (
        <p className="mt-6 text-sm text-ink-soft">Forelæsningen blev ikke fundet.</p>
      ) : (
        <section className="panel mt-4 p-6 sm:p-8">
          <p className="label-mono">
            Forelæsning {forelaesning.nummer} · {formatDato(forelaesning.dato)}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {forelaesning.emne}
          </h1>

          {renHtml ? (
            <div
              className="studienote mt-6 text-sm leading-relaxed text-ink"
              ref={noteRef}
              dangerouslySetInnerHTML={{ __html: renHtml }}
            />
          ) : forelaesning.note_url ? (
            <p className="mt-6 text-sm text-ink-soft">
              Denne note findes kun som ekstern note.{" "}
              <a
                href={forelaesning.note_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-steel underline-offset-4 hover:underline"
              >
                Åbn note
              </a>
            </p>
          ) : (
            <p className="mt-6 text-sm text-ink-soft">Ingen note er tilføjet endnu.</p>
          )}
        </section>
      )}
    </>
  );
}
