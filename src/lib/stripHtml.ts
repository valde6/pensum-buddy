// Fjerner HTML-tags fra en streng og efterlader ren, søgbar tekst. Delt mellem
// scripts/backfill-note-tekst.mjs og API'et for nye noter (src/routes/api/…),
// så vi ikke har den samme udtræknings-logik to steder.
export function stripHtml(html: string): string {
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
