import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { hentFag, tilfoejForelaesning } from "@/lib/pensum";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Tilføj forelæsning — Pensummit" },
      {
        name: "description",
        content:
          "Tilføj en ny forelæsning med nummer, dato, emne og link til den genererede HTML-note.",
      },
      { property: "og:title", content: "Tilføj forelæsning — Pensummit" },
      {
        property: "og:description",
        content: "Admin-formular til at koble nye noter ind i Pensummit.",
      },
    ],
  }),
  component: AdminSide,
});

const felt =
  "mt-1.5 w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40";

function AdminSide() {
  const queryClient = useQueryClient();
  const fag = useQuery({ queryKey: ["fag"], queryFn: hentFag });

  const [fagId, setFagId] = useState("");
  const [nummer, setNummer] = useState("");
  const [dato, setDato] = useState("");
  const [emne, setEmne] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [besked, setBesked] = useState<string | null>(null);

  const gem = useMutation({
    mutationFn: () =>
      tilfoejForelaesning({
        fag_id: fagId || (fag.data?.[0]?.id ?? ""),
        nummer: Number(nummer),
        dato: dato || null,
        emne,
        note_url: noteUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forelaesning"] });
      setBesked("Forelæsningen er tilføjet.");
      setNummer("");
      setDato("");
      setEmne("");
      setNoteUrl("");
    },
    onError: (e: Error) => setBesked(`Kunne ikke gemme: ${e.message}`),
  });

  return (
    <>
      <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
        Tilføj forelæsning
      </h1>
      <p className="mt-3 max-w-[52ch] text-base text-ink-soft">
        Brug denne formular hver gang en ny HTML-note er genereret, så den kan
        linkes ind på fagets side.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBesked(null);
          gem.mutate();
        }}
        className="panel mt-6 max-w-xl space-y-4 p-6"
      >
        <div>
          <label htmlFor="fag" className="label-mono">
            Fag
          </label>
          <select
            id="fag"
            required
            value={fagId}
            onChange={(e) => setFagId(e.target.value)}
            className={felt}
          >
            <option value="">Vælg fag…</option>
            {(fag.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.navn}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nummer" className="label-mono">
              Nummer
            </label>
            <input
              id="nummer"
              type="number"
              min="1"
              required
              value={nummer}
              onChange={(e) => setNummer(e.target.value)}
              className={felt}
            />
          </div>
          <div>
            <label htmlFor="dato" className="label-mono">
              Dato
            </label>
            <input
              id="dato"
              type="date"
              value={dato}
              onChange={(e) => setDato(e.target.value)}
              className={felt}
            />
          </div>
        </div>
        <div>
          <label htmlFor="emne" className="label-mono">
            Emne
          </label>
          <input
            id="emne"
            required
            value={emne}
            onChange={(e) => setEmne(e.target.value)}
            placeholder="Tema for forelæsningen"
            className={felt}
          />
        </div>
        <div>
          <label htmlFor="note" className="label-mono">
            Note-URL
          </label>
          <input
            id="note"
            type="url"
            value={noteUrl}
            onChange={(e) => setNoteUrl(e.target.value)}
            placeholder="https://…"
            className={felt}
          />
        </div>
        {besked && <p className="text-sm text-ink-soft">{besked}</p>}
        <button
          type="submit"
          disabled={gem.isPending}
          className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {gem.isPending ? "Gemmer…" : "Tilføj forelæsning"}
        </button>
      </form>
    </>
  );
}
