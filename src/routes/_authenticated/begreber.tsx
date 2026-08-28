import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { hentBegreber, hentFag, hentForelaesninger } from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/begreber")({
  head: () => ({
    meta: [
      { title: "Begreber — Pensummit" },
      {
        name: "description",
        content:
          "Søgbar oversigt over alle begreber på semesteret med definition, fag og forelæsning.",
      },
      { property: "og:title", content: "Begreber — Pensummit" },
      {
        property: "og:description",
        content: "Søg og filtrér semesterets begreber på tværs af fag.",
      },
    ],
  }),
  component: BegreberSide,
});

function BegreberSide() {
  const [soeg, setSoeg] = useState("");
  const [fagFilter, setFagFilter] = useState<string>("alle");

  const fag = useQuery({ queryKey: ["fag"], queryFn: hentFag });
  const forelaesninger = useQuery({
    queryKey: ["forelaesning"],
    queryFn: () => hentForelaesninger(),
  });
  const begreber = useQuery({ queryKey: ["begreb"], queryFn: hentBegreber });

  const filtreret = (begreber.data ?? []).filter((b) => {
    const passerFag = fagFilter === "alle" || b.fag_id === fagFilter;
    const q = soeg.trim().toLowerCase();
    const passerSoeg =
      q === "" ||
      b.navn.toLowerCase().includes(q) ||
      (b.definition ?? "").toLowerCase().includes(q);
    return passerFag && passerSoeg;
  });

  return (
    <>
      <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
        Begreber
      </h1>
      <p className="mt-3 max-w-[52ch] text-base text-ink-soft">
        Alle begreber på tværs af semesterets fag — søg eller filtrér.
      </p>

      <div className="panel mt-6 space-y-4 p-5">
        <input
          type="search"
          value={soeg}
          onChange={(e) => setSoeg(e.target.value)}
          placeholder="Søg i begreber og definitioner…"
          className="w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFagFilter("alle")}
            className={`label-mono rounded-full px-2.5 py-1 ${
              fagFilter === "alle" ? "bg-steel text-surface" : "bg-steel-soft"
            }`}
          >
            Alle fag
          </button>
          {(fag.data ?? []).map((f) => (
            <button
              key={f.id}
              onClick={() => setFagFilter(f.id)}
              className={`label-mono rounded-full px-2.5 py-1 normal-case tracking-normal ${
                fagFilter === f.id ? "bg-steel text-surface" : "bg-steel-soft"
              }`}
            >
              {f.navn}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-6 space-y-3">
        {filtreret.length === 0 && (
          <p className="text-sm text-ink-soft">Ingen begreber matcher søgningen.</p>
        )}
        {filtreret.map((b) => {
          const fagNavn = (fag.data ?? []).find((f) => f.id === b.fag_id)?.navn;
          const fl = (forelaesninger.data ?? []).find((x) => x.id === b.forelaesning_id);
          return (
            <div key={b.id} className="panel p-5">
              <dt className="font-display text-lg font-semibold tracking-tight">
                {b.navn}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                {b.definition}
              </dd>
              <p className="label-mono mt-3 normal-case tracking-normal">
                {fagNavn ?? "—"}
                {fl ? ` · Forelæsning ${fl.nummer}: ${fl.emne}` : ""}
              </p>
            </div>
          );
        })}
      </dl>
    </>
  );
}
