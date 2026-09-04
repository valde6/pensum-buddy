import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nuvaerendeTema, skiftTema } from "@/lib/theme";
import { FeedbackModal } from "@/components/FeedbackModal";

const feedbackKnap =
  "label-mono rounded-full bg-sage-soft px-3 py-1.5 normal-case tracking-normal text-sage";

const linkBase =
  "px-3 py-2 rounded-lg text-sm transition-colors text-ink-soft hover:text-ink";

export function AppHeader({ email }: { email?: string | null | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tema, setTema] = useState(() => nuvaerendeTema());
  const [feedbackAaben, setFeedbackAaben] = useState(false);

  function haandterTemaSkift() {
    setTema(skiftTema());
  }

  const initialer = (email ?? "?")
    .split(/[.@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  async function logUd() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-steel font-display text-lg font-semibold text-surface">
              P
            </span>
            <span className="block">
              <span className="block font-display text-lg font-semibold leading-none tracking-tight">
                Pensummit
              </span>
              <span className="label-mono mt-1 block normal-case tracking-[0.1em]">
                CBS HA(it)
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link to="/dashboard" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
              Dashboard
            </Link>
            <Link to="/begreber" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
              Begreber
            </Link>
            <Link to="/repetition" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
              Repetition
            </Link>
            <Link to="/kalender" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
              Kalender
            </Link>
            <Link to="/admin" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
              Admin
            </Link>
            <button onClick={() => setFeedbackAaben(true)} className={feedbackKnap}>
              Feedback
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={haandterTemaSkift}
              aria-label={tema === "dark" ? "Skift til lyst tema" : "Skift til mørkt tema"}
              className="grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:text-ink"
            >
              {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              onClick={logUd}
              className="label-mono rounded-lg px-2 py-2 transition-colors hover:text-ink"
            >
              Log ud
            </button>
            <span
              title={email ?? undefined}
              className="grid size-9 place-items-center rounded-xl bg-clay-soft text-sm font-semibold text-clay"
            >
              {initialer || "?"}
            </span>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-line px-5 py-2 sm:hidden">
          <Link to="/dashboard" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
            Dashboard
          </Link>
          <Link to="/begreber" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
            Begreber
          </Link>
          <Link to="/repetition" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
            Repetition
          </Link>
          <Link to="/kalender" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
            Kalender
          </Link>
          <Link to="/admin" className={linkBase} activeProps={{ className: "px-3 py-2 rounded-lg text-sm bg-steel-soft text-ink font-medium" }}>
            Admin
          </Link>
          <button onClick={() => setFeedbackAaben(true)} className={feedbackKnap}>
            Feedback
          </button>
        </nav>
      </header>

      {feedbackAaben && <FeedbackModal onClose={() => setFeedbackAaben(false)} />}
    </>
  );
}
