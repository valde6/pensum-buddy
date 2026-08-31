import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function supabaseProjectUrl(): string {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  if (!url) throw new Error("SUPABASE_URL (eller VITE_SUPABASE_URL) mangler");
  return url;
}

function supabasePublishableKey(): string {
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"];
  if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY (eller en anon-nøgle) mangler");
  return key;
}

// Tilsvarende supabaseForUser i src/lib/mcp/supabase.ts, men for almindelige
// HTTP-requests i stedet for et MCP ToolContext: læser Authorization-headeren
// direkte fra requestet og videresender samme bearer-token, så RLS kører som
// den kaldende bruger. Ingen service role-nøgle involveret.
export function supabaseForRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Kræver en Authorization: Bearer <token>-header");
  }
  return createClient<Database>(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
