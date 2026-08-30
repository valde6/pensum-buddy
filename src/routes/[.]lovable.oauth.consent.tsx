import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Godkend adgang — Pensummit" },
      {
        name: "description",
        content: "Godkend eller afvis, at en AI-klient må bruge Pensummit som dig.",
      },
      { property: "og:title", content: "Godkend adgang — Pensummit" },
      {
        property: "og:description",
        content: "Giv en AI-assistent adgang til dit Pensummit-pensum og din fremgang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Manglende authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const detaljer = data as AuthorizationDetails | null;
    const immediate = redirectMaal(detaljer);
    if (immediate && !detaljer?.client) throw redirect({ href: immediate });
    return detaljer;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-xl font-semibold tracking-tight">
        Kunne ikke indlæse anmodningen
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [venter, setVenter] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const navn = details?.client?.name ?? "Klienten";


  async function beslut(godkend: boolean) {
    setVenter(true);
    setFejl(null);
    const { data, error } = godkend
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setVenter(false);
      setFejl(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setVenter(false);
      setFejl("Autorisationsserveren returnerede ingen viderestilling.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
      <div className="w-full">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-steel font-display text-lg font-semibold text-surface">
            P
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold leading-none tracking-tight">
              Pensummit
            </h1>
            <p className="label-mono mt-1">Godkend adgang</p>
          </div>
        </div>

        <div className="panel mt-6 space-y-4 p-6">
          <h2 className="font-display text-base font-semibold">
            Forbind {navn} til din konto
          </h2>
          <p className="text-sm text-ink-soft">
            {navn} vil kunne læse semesterets fag, forelæsninger, begreber og
            litteratur samt se og opdatere din egen studiefremgang — som dig.
          </p>
          {fejl && <p className="text-sm text-destructive">{fejl}</p>}
          <div className="flex gap-2">
            <button
              disabled={venter}
              onClick={() => beslut(true)}
              className="flex-1 rounded-lg bg-steel px-4 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Godkend
            </button>
            <button
              disabled={venter}
              onClick={() => beslut(false)}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium ring-1 ring-line transition-colors hover:bg-steel-soft disabled:opacity-60"
            >
              Afvis
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
