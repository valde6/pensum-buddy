import { jsPDF } from "jspdf";
import type { Begreb, Fag, Forelaesning, Litteratur } from "@/lib/pensum";

// Genbruger mønsteret fra bygBegrebsMarkdown i begreber.tsx: saml alt pensum
// grupperet efter fag, men eksportér som PDF i stedet for Markdown.
export function eksporterPensumSomPdf(
  fagData: Fag[],
  forelaesningerData: Forelaesning[],
  litteraturData: Litteratur[],
  begreberData: Begreb[],
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const bredde = doc.internal.pageSize.getWidth() - margin * 2;
  const hoejde = doc.internal.pageSize.getHeight();
  let y = margin;

  function nyLinjeHvisNoedvendig(plads: number) {
    if (y + plads > hoejde - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function skriv(
    tekst: string,
    { stoerrelse = 10, fed = false, farve = "#111111" }: { stoerrelse?: number; fed?: boolean; farve?: string } = {},
  ) {
    doc.setFont("helvetica", fed ? "bold" : "normal");
    doc.setFontSize(stoerrelse);
    doc.setTextColor(farve);
    const linjehoejde = stoerrelse * 1.35;
    const linjer = doc.splitTextToSize(tekst, bredde) as string[];
    for (const l of linjer) {
      nyLinjeHvisNoedvendig(linjehoejde);
      doc.text(l, margin, y);
      y += linjehoejde;
    }
  }

  const dato = new Date().toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  skriv("Pensummit — samlet pensum", { stoerrelse: 20, fed: true });
  skriv(`Genereret ${dato}`, { stoerrelse: 9, farve: "#666666" });

  for (const f of fagData) {
    y += 18;
    nyLinjeHvisNoedvendig(24);
    skriv(f.navn, { stoerrelse: 15, fed: true });
    const undertekst = [
      `${Number(f.ects)} ECTS`,
      f.eksamensform ? `Eksamensform: ${f.eksamensform}` : null,
      f.eksamensperiode ? `Eksamensperiode: ${f.eksamensperiode}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    skriv(undertekst, { stoerrelse: 9, farve: "#666666" });

    const fagsForelaesninger = forelaesningerData.filter((fl) => fl.fag_id === f.id);
    if (fagsForelaesninger.length > 0) {
      y += 8;
      skriv("Forelæsninger", { stoerrelse: 11, fed: true });
      for (const fl of fagsForelaesninger) {
        skriv(`${fl.nummer}. ${fl.emne}`, { stoerrelse: 10 });
      }
    }

    const fagsLitteratur = litteraturData.filter((l) => l.fag_id === f.id);
    if (fagsLitteratur.length > 0) {
      y += 8;
      skriv("Litteratur", { stoerrelse: 11, fed: true });
      for (const l of fagsLitteratur) {
        skriv(`${l.titel}${l.forfatter ? ` — ${l.forfatter}` : ""}`, { stoerrelse: 10 });
      }
    }

    const fagsBegreber = begreberData.filter((b) => b.fag_id === f.id);
    if (fagsBegreber.length > 0) {
      y += 8;
      skriv("Begreber", { stoerrelse: 11, fed: true });
      for (const b of fagsBegreber) {
        skriv(`${b.navn}: ${b.definition ?? "—"}`, { stoerrelse: 10 });
      }
    }
  }

  doc.save("pensummit-pensum.pdf");
}
