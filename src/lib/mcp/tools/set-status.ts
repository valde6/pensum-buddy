import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_forelaesning_status",
  title: "Opdatér fremgang",
  description:
    "Sæt den indloggede brugers status for en forelæsning: ikke startet, gennemgået eller repeteret.",
  inputSchema: {
    forelaesning_id: z.string().uuid().describe("Id på forelæsningen."),
    status: z.enum(["ikke startet", "gennemgået", "repeteret"]).describe("Ny status."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ forelaesning_id, status }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Ikke logget ind" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("fremgang")
      .upsert(
        {
          bruger_id: ctx.getUserId(),
          forelaesning_id,
          status,
          opdateret_dato: new Date().toISOString(),
        },
        { onConflict: "bruger_id,forelaesning_id" },
      )
      .select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { fremgang: data?.[0] ?? null },
    };
  },
});
