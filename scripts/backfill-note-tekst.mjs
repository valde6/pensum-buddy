#!/usr/bin/env node
// Henter HTML-noten for hver forelæsning med et note_url, strippen tags og
// gemmer den rensede tekst i forelaesning.note_tekst — så indholdet kan
// søges i, ikke kun begrebernes navn/definition.
//
// Kør IKKE dette script automatisk. Køres manuelt, efter migrationen der
// tilføjer note_tekst-kolonnen er kørt i Lovables SQL-editor:
//
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-nøgle> \
//   node scripts/backfill-note-tekst.mjs
//
// Kræver service role-nøglen (ikke den offentlige anon/publishable-nøgle),
// da scriptet skal kunne opdatere alle forelæsninger uafhængigt af RLS.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mangler SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY i miljøet.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function hentOgStrip(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const html = await res.text();
  return stripHtml(html);
}

async function main() {
  const { data: forelaesninger, error } = await supabase
    .from("forelaesning")
    .select("id, note_url")
    .not("note_url", "is", null);

  if (error) throw new Error(error.message);

  console.log(`Fandt ${forelaesninger.length} forelæsning(er) med note_url.`);

  for (const fl of forelaesninger) {
    try {
      const noteTekst = await hentOgStrip(fl.note_url);
      const { error: opdaterError } = await supabase
        .from("forelaesning")
        .update({ note_tekst: noteTekst })
        .eq("id", fl.id);
      if (opdaterError) throw new Error(opdaterError.message);
      console.log(`✓ ${fl.id} (${noteTekst.length} tegn)`);
    } catch (e) {
      console.error(`✗ ${fl.id}: ${e.message}`);
    }
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
