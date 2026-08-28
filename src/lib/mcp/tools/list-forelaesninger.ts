import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_forelaesninger",
  title: "Vis forelæsninger",
  description:
    "List forelæsninger med emne, dato, note-link og den indloggede brugers status (ikke startet / gennemgået / repeteret). Filtrér eventuelt på fag.",
  inputSchema: {
    fag_id: z.string().uuid().optional().describe("Valgfrit fag-id at filtrere på."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ fag_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Ikke logget ind" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("forelaesning").select("*").order("nummer");
    if (fag_id) q = q.eq("fag_id", fag_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const { data: fremgang, error: fejl } = await supabase
      .from("fremgang")
      .select("forelaesning_id,status");
    if (fejl) return { content: [{ type: "text", text: fejl.message }], isError: true };

    const statusEfterId = new Map(
      (fremgang ?? []).map((r) => [r.forelaesning_id as string, r.status as string]),
    );
    const rows = (data ?? []).map((f) => ({
      ...f,
      status: statusEfterId.get(f.id as string) ?? "ikke startet",
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { forelaesninger: rows },
    };
  },
});
