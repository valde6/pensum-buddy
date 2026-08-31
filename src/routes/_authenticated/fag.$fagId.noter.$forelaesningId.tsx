import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { formatDato, hentForelaesninger } from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/fag/$fagId/noter/$forelaesningId")({
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

function NoteSide() {
  const { fagId, forelaesningId } = Route.useParams();

  const forelaesninger = useQuery({
    queryKey: ["forelaesning", fagId],
    queryFn: () => hentForelaesninger(fagId),
  });

  const forelaesning = (forelaesninger.data ?? []).find((fl) => fl.id === forelaesningId);
  const renHtml = forelaesning?.note_html ? DOMPurify.sanitize(forelaesning.note_html) : null;

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
              className="mt-6 text-sm leading-relaxed text-ink"
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
