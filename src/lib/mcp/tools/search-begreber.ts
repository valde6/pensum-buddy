import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_begreber",
  title: "Søg begreber",
  description: "Søg i pensums begreber og definitioner, eventuelt filtreret på fag.",
  inputSchema: {
    soegning: z.string().trim().optional().describe("Fritekst i navn eller definition."),
    fag_id: z.string().uuid().optional().describe("Valgfrit fag-id at filtrere på."),
    limit: z.number().int().min(1).max(100).optional().describe("Maks antal rækker (standard 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ soegning, fag_id, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Ikke logget ind" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("begreb").select("*").order("navn").limit(limit ?? 25);
    if (fag_id) q = q.eq("fag_id", fag_id);
    if (soegning) q = q.or(`navn.ilike.%${soegning}%,definition.ilike.%${soegning}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { begreber: data ?? [] },
    };
  },
});
