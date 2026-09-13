import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseForRequest } from "@/lib/api/supabase";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

const CANVAS_BASE_URL = "https://cbscanvas.instructure.com";

// REST-endpointet /api/v1/courses/:id/assignments er blokeret for studerende
// på CBS' Canvas-instans. GraphQL-endpointet virker og henter i stedet
// brugerens egne "course work submissions" på tværs af alle kurser i ét hug
// (pagineret), som vi bagefter filtrerer ned til de fag, vi selv kender.
type CanvasCourseWorkSubmissionNode = {
  _id: string;
  submittedAt: string | null;
  late: boolean | null;
  missing: boolean | null;
  state: string;
  assignment: {
    _id: string;
    name: string;
    dueAt: string | null;
    pointsPossible: number | null;
    htmlUrl: string;
    submissionTypes: string[];
    course: { _id: string; name: string } | null;
  } | null;
};

type CanvasGraphQlSvar = {
  data?: {
    legacyNode?: {
      courseWorkSubmissionsConnection?: {
        nodes: CanvasCourseWorkSubmissionNode[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
  };
  errors?: { message: string }[];
};

const CANVAS_GRAPHQL_QUERY = `
  query($userId: ID!, $after: String) {
    legacyNode(_id: $userId, type: User) {
      ... on User {
        courseWorkSubmissionsConnection(
          filter: { states: [unsubmitted, submitted, graded] }
          after: $after
        ) {
          nodes {
            _id
            submittedAt
            late
            missing
            state
            assignment {
              _id
              name
              dueAt
              pointsPossible
              htmlUrl
              submissionTypes
              course {
                _id
                name
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

// users/self returnerer den kaldende bruger selv (scoped af tokenet) — ingen
// bruger-id skal hardcodes.
async function hentCanvasBrugerId(token: string): Promise<string> {
  const res = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("[canvas] users/self status:", res.status);
  if (!res.ok) {
    const fejltekst = await res.text();
    console.error("[canvas] Kunne ikke hente Canvas-bruger-id:", fejltekst);
    throw new Error(`Canvas svarede ${res.status} for users/self`);
  }
  const data = (await res.json()) as { id: number | string };
  return String(data.id);
}

async function hentAlleCourseWorkSubmissions(
  userId: string,
  token: string,
): Promise<CanvasCourseWorkSubmissionNode[]> {
  const noder: CanvasCourseWorkSubmissionNode[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await fetch(`${CANVAS_BASE_URL}/api/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CANVAS_GRAPHQL_QUERY,
        variables: { userId, after },
      }),
    });
    console.log("[canvas] graphql side status:", res.status, "after:", after);
    if (!res.ok) {
      const fejltekst = await res.text();
      console.error("[canvas] GraphQL-fejl:", fejltekst);
      throw new Error(`Canvas GraphQL svarede ${res.status}`);
    }

    const svar = (await res.json()) as CanvasGraphQlSvar;
    if (svar.errors?.length) {
      console.error("[canvas] GraphQL-fejl i svar:", svar.errors);
      throw new Error(svar.errors.map((e) => e.message).join("; "));
    }

    const connection = svar.data?.legacyNode?.courseWorkSubmissionsConnection;
    if (!connection) {
      throw new Error("Uventet GraphQL-svar fra Canvas");
    }

    noder.push(...connection.nodes);
    hasNextPage = connection.pageInfo.hasNextPage;
    after = connection.pageInfo.endCursor;
  }

  return noder;
}

export const Route = createFileRoute("/api/canvas-opgaver")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        // RLS begrænser rækken til den kaldende bruger — token forlader aldrig
        // denne handler og optræder aldrig i noget svar.
        const { data: tokenRaekke, error: tokenError } = await supabase
          .from("bruger_canvas_token")
          .select("token")
          .maybeSingle();
        if (tokenError) return json({ error: tokenError.message }, { status: 400 });
        if (!tokenRaekke) return json({ harToken: false });

        const { data: fagListe, error: fagError } = await supabase
          .from("fag")
          .select("id, navn, canvas_kursus_id")
          .not("canvas_kursus_id", "is", null);
        if (fagError) return json({ error: fagError.message }, { status: 400 });
        console.log("[canvas] fag med kursus-id:", fagListe?.length);

        const fagForKursusId = new Map((fagListe ?? []).map((f) => [f.canvas_kursus_id, f.id]));

        let noder: CanvasCourseWorkSubmissionNode[];
        try {
          const brugerId = await hentCanvasBrugerId(tokenRaekke.token);
          console.log("[canvas] Canvas-bruger-id:", brugerId);
          noder = await hentAlleCourseWorkSubmissions(brugerId, tokenRaekke.token);
        } catch (e) {
          console.error("[canvas] Kunne ikke synkronisere Canvas-opgaver:", e);
          return json({ error: "Kunne ikke hente opgaver fra Canvas" }, { status: 502 });
        }
        console.log("[canvas] assignments fra Canvas:", noder.length);

        const rows: Database["public"]["Tables"]["canvas_opgave"]["Insert"][] = [];
        for (const node of noder) {
          const assignment = node.assignment;
          if (!assignment?.course) continue;

          const kursusId = assignment.course._id;
          const fagId = fagForKursusId.get(kursusId);
          if (!fagId) continue;

          rows.push({
            fag_id: fagId,
            canvas_kursus_id: kursusId,
            canvas_assignment_id: assignment._id,
            titel: assignment.name,
            forfaldsdato: assignment.dueAt ?? null,
            url_til_canvas: assignment.htmlUrl,
            points: assignment.pointsPossible ?? null,
            submission_types: assignment.submissionTypes,
            submission_state: node.state,
            submitted_at: node.submittedAt ?? null,
            late: node.late ?? false,
            missing: node.missing ?? false,
            sidst_synkroniseret: new Date().toISOString(),
          });
        }
        console.log("[canvas] assignments matchet til kendte fag:", rows.length);

        if (rows.length > 0) {
          const { error: upsertError } = await supabase
            .from("canvas_opgave")
            .upsert(rows, { onConflict: "canvas_assignment_id" });
          if (upsertError) console.error("[canvas] upsert fejl:", upsertError.message);
          if (upsertError) return json({ error: upsertError.message }, { status: 400 });
        }

        const { data: opgaver, error: opgaverError } = await supabase
          .from("canvas_opgave")
          .select("*, fag:fag_id(navn)")
          .order("forfaldsdato", { ascending: true });
        if (opgaverError) return json({ error: opgaverError.message }, { status: 400 });

        return json({ harToken: true, opgaver: opgaver ?? [] });
      },

      POST: async ({ request }) => {
        let supabase: SupabaseClient<Database>;
        try {
          supabase = supabaseForRequest(request);
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 401 });
        }

        const {
          data: { user },
          error: brugerError,
        } = await supabase.auth.getUser();
        if (brugerError || !user) {
          return json({ error: "Ikke logget ind" }, { status: 401 });
        }

        const body = (await request.json()) as { token?: unknown };
        const token = typeof body.token === "string" ? body.token.trim() : "";
        if (!token) {
          return json({ error: "Mangler token" }, { status: 400 });
        }

        const { error } = await supabase
          .from("bruger_canvas_token")
          .upsert({ bruger_id: user.id, token }, { onConflict: "bruger_id" });
        if (error) return json({ error: error.message }, { status: 400 });

        return json({ ok: true });
      },
    },
  },
});
