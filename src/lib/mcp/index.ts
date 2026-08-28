import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFag from "./tools/list-fag";
import listForelaesninger from "./tools/list-forelaesninger";
import searchBegreber from "./tools/search-begreber";
import listLitteratur from "./tools/list-litteratur";
import setStatus from "./tools/set-status";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "pensummit",
  title: "Pensummit",
  version: "0.1.0",
  instructions:
    "Værktøjer til Pensummit, et semesteroverblik for en CBS HA(it)-læsegruppe. Brug list_fag til fag og eksamener, list_forelaesninger til forelæsninger og egen status, search_begreber til pensumbegreber, list_litteratur til litteratur, og set_forelaesning_status til at opdatere egen fremgang.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFag, listForelaesninger, searchBegreber, listLitteratur, setStatus],
});
