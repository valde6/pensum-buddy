import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const felt =
  "mt-1.5 w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fejl, setFejl] = useState<string | null>(null);
  const [venter, setVenter] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
    const tidligereOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = tidligereOverflow;
    };
  }, []);

  useEffect(() => {
    function paaTast(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", paaTast);
    return () => window.removeEventListener("keydown", paaTast);
  }, [onClose]);

  async function logInd(e: React.FormEvent) {
    e.preventDefault();
    setFejl(null);
    setVenter(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setVenter(false);
    if (error) {
      setFejl("Kunne ikke logge ind. Kontrollér e-mail og adgangskode.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-titel"
        className="panel relative w-full max-w-sm p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Luk"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:text-ink"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-steel font-display text-lg font-semibold text-surface">
            P
          </span>
          <div>
            <h2
              id="login-titel"
              className="font-display text-lg font-semibold leading-none tracking-tight"
            >
              Pensummit
            </h2>
            <p className="label-mono mt-1">Lukket studiegruppe</p>
          </div>
        </div>

        <form onSubmit={logInd} className="mt-6 space-y-4">
          <div>
            <label htmlFor="modal-email" className="label-mono">
              E-mail
            </label>
            <input
              id="modal-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={felt}
            />
          </div>
          <div>
            <label htmlFor="modal-password" className="label-mono">
              Adgangskode
            </label>
            <input
              id="modal-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={felt}
            />
          </div>
          {fejl && <p className="text-sm text-destructive">{fejl}</p>}
          <button
            type="submit"
            disabled={venter}
            className="w-full rounded-lg bg-steel px-4 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {venter ? "Logger ind…" : "Log ind"}
          </button>
          <p className="text-xs text-ink-soft">
            Der er ingen selv-oprettelse. Kontakt administratoren for at blive inviteret til
            gruppen.
          </p>
        </form>
      </div>
    </div>
  );
}
