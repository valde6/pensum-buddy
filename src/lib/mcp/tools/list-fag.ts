import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_fag",
  title: "Vis fag",
  description:
    "List semesterets fag med ECTS, eksamensform, eksamensperiode og eksamensdato.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Ikke logget ind" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("fag").select("*").order("navn");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { fag: data ?? [] },
    };
  },
});
