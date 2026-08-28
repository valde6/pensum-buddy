import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_litteratur",
  title: "Vis litteratur",
  description: "List pensumlitteratur med titel, forfatter, type og link, eventuelt filtreret på fag.",
  inputSchema: {
    fag_id: z.string().uuid().optional().describe("Valgfrit fag-id at filtrere på."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ fag_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Ikke logget ind" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("litteratur").select("*").order("titel");
    if (fag_id) q = q.eq("fag_id", fag_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { litteratur: data ?? [] },
    };
  },
});
