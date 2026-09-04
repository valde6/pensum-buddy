import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const TYPER = ["Fejl", "Forslag", "Andet"] as const;
type FeedbackType = (typeof TYPER)[number];

const felt =
  "mt-1.5 w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40";

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();

  const [type, setType] = useState<FeedbackType | null>(null);
  const [titel, setTitel] = useState("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [sender, setSender] = useState(false);
  const [besked, setBesked] = useState<string | null>(null);
  const [sendt, setSendt] = useState(false);

  async function haandterSend() {
    if (!type || !titel.trim()) {
      setBesked("Udfyld venligst type og titel.");
      return;
    }

    setBesked(null);
    setSender(true);
    const { error } = await supabase.functions.invoke("send-feedback", {
      body: { type, titel: titel.trim(), beskrivelse: beskrivelse.trim(), side: pathname },
    });
    setSender(false);

    if (error) {
      setBesked("Kunne ikke sende feedback. Prøv igen.");
      return;
    }

    setSendt(true);
    setTimeout(onClose, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {sendt ? (
          <p className="py-6 text-center text-base font-medium">Tak for din feedback!</p>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold tracking-tight">Send feedback</h2>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {TYPER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`label-mono rounded-full px-2.5 py-1 normal-case tracking-normal ${
                    type === t ? "bg-steel text-surface" : "bg-steel-soft"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label htmlFor="feedback-titel" className="label-mono">
                Titel
              </label>
              <input
                id="feedback-titel"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                className={felt}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="feedback-beskrivelse" className="label-mono">
                Beskrivelse
              </label>
              <textarea
                id="feedback-beskrivelse"
                value={beskrivelse}
                onChange={(e) => setBeskrivelse(e.target.value)}
                rows={4}
                className={`${felt} resize-none`}
              />
            </div>

            <p className="mt-3 text-xs text-ink-soft">
              Din e-mail, sidens navn og tidspunkt sendes automatisk med.
            </p>

            {besked && <p className="mt-3 text-sm text-ink-soft">{besked}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="label-mono rounded-lg px-4 py-2.5 normal-case tracking-normal text-ink-soft transition-colors hover:text-ink"
              >
                Annullér
              </button>
              <button
                type="button"
                onClick={haandterSend}
                disabled={sender}
                className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {sender ? "Sender…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
