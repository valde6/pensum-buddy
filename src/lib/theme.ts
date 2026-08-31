export const TEMA_NOEGLE = "pensummit-theme";
export type Tema = "light" | "dark";

// Samme logik som det inline no-flash-script i __root.tsx (holdt i sync manuelt,
// da scriptet skal køre synkront før React hydrerer og ikke kan importere dette).
export function foretrukketTema(): Tema {
  try {
    const gemt = localStorage.getItem(TEMA_NOEGLE);
    if (gemt === "light" || gemt === "dark") return gemt;
  } catch {
    // localStorage utilgængelig (fx privat browsing) — falder tilbage til systemvalg.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function anvendTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "dark");
}

export function gemTema(tema: Tema) {
  try {
    localStorage.setItem(TEMA_NOEGLE, tema);
  } catch {
    // Ignorér — temaet virker stadig for denne session, blot uden at blive husket.
  }
}

export function nuvaerendeTema(): Tema {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function skiftTema(): Tema {
  const nyt: Tema = nuvaerendeTema() === "dark" ? "light" : "dark";
  anvendTema(nyt);
  gemTema(nyt);
  return nyt;
}
