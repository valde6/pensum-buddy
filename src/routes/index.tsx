import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pensummit — semesteroverblik for HA(it)" },
      {
        name: "description",
        content:
          "Pensummit samler fag, eksamensformer, forelæsninger, litteratur, begreber og studiefremgang for et CBS HA(it)-semester.",
      },
      { property: "og:title", content: "Pensummit — semesteroverblik for HA(it)" },
      {
        property: "og:description",
        content:
          "Ét roligt overblik over semesterets fag, noter, begreber og din egen fremgang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forside,
});

function Forside() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Pensummit</h1>
        <p className="label-mono mt-2">Indlæser dit semesteroverblik…</p>
      </div>
    </div>
  );
}
