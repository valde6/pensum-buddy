import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log ind — Pensummit" },
      {
        name: "description",
        content:
          "Log ind på Pensummit for at se semesterets fag, forelæsninger, begreber og din studiefremgang.",
      },
      { property: "og:title", content: "Log ind — Pensummit" },
      {
        property: "og:description",
        content: "Pensummit er et lukket studieværktøj for en CBS HA(it)-læsegruppe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s['next'] === "string" && s['next'] ? { next: s['next'] } : {},
  component: AuthPage,
});

// Only same-origin relative paths may be used as a post-login destination.
function sikkerSti(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fejl, setFejl] = useState<string | null>(null);
  const [venter, setVenter] = useState(false);

  function videre() {
    const sti = sikkerSti(next ?? "");
    if (sti) {
      window.location.replace(sti);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) videre();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

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
    videre();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-steel font-display text-lg font-semibold text-surface">
            P
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold leading-none tracking-tight">
              Pensummit
            </h1>
            <p className="label-mono mt-1">Lukket studiegruppe</p>
          </div>
        </div>

        <form onSubmit={logInd} className="panel mt-6 space-y-4 p-6">
          <div>
            <label htmlFor="email" className="label-mono">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40"
            />
          </div>
          <div>
            <label htmlFor="password" className="label-mono">
              Adgangskode
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-steel/40"
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
            Der er ingen selv-oprettelse. Kontakt administratoren for at blive
            inviteret til gruppen.
          </p>
        </form>
      </div>
    </div>
  );
}
