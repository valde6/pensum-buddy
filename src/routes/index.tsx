import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Mail,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoginModal } from "@/components/LoginModal";
import { nuvaerendeTema, skiftTema, type Tema } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pensummit — semesteroverblik for HA(it)" },
      {
        name: "description",
        content:
          "Pensummit samler fag, eksamensformer, forelæsninger, litteratur, begreber og studiefremgang for et CBS HA(it)-semester.",
      },
      { property: "og:title", content: "Pensummit — semesteroverblik for HA(it)" },
      {
        property: "og:description",
        content: "Ét roligt overblik over semesterets fag, noter, begreber og din egen fremgang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forside,
});

const KONTAKT_MAIL = "kontakt@pensummit.dk";
const INDHOLD = "mx-auto max-w-5xl px-5 sm:px-6";

function Forside() {
  const navigate = useNavigate();
  const [loginAaben, setLoginAaben] = useState(false);
  const [harSession, setHarSession] = useState(false);
  const [tema, setTema] = useState<Tema>("light");
  const [scrollet, setScrollet] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      setHarSession(true);
      navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    setTema(nuvaerendeTema());
  }, []);

  useEffect(() => {
    function paaScroll() {
      setScrollet(window.scrollY > 8);
    }
    paaScroll();
    window.addEventListener("scroll", paaScroll, { passive: true });
    return () => window.removeEventListener("scroll", paaScroll);
  }, []);

  function tilFunktioner() {
    document.getElementById("funktioner")?.scrollIntoView({ behavior: "smooth" });
  }

  if (harSession) return null;

  return (
    <div className="min-h-screen">
      <header
        className={`sticky top-0 z-40 transition-colors ${
          scrollet
            ? "border-b border-line bg-paper/80 backdrop-blur"
            : "border-b border-transparent"
        }`}
      >
        <div className={`${INDHOLD} flex items-center justify-between gap-4 py-4`}>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-steel font-display text-lg font-semibold text-surface">
              P
            </span>
            <span className="block">
              <span className="block font-display text-lg font-semibold leading-none tracking-tight">
                Pensummit
              </span>
              <span className="label-mono mt-1 block normal-case tracking-[0.1em]">CBS HA(it)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TemaKnap tema={tema} onSkift={() => setTema(skiftTema())} />
            <button
              onClick={() => setLoginAaben(true)}
              className="rounded-lg bg-steel px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
            >
              Log ind
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={`${INDHOLD} pb-4 pt-10 sm:pt-16`}>
          <div className="rounded-2xl border border-steel/20 bg-steel/10 p-6 sm:p-10">
            <p className="label-mono">Bygget til CBS HA(it) · 3. semester</p>
            <h1 className="mt-4 max-w-[18ch] font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Semesteret. Samlet. Overskueligt.
            </h1>
            <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-ink-soft sm:text-lg">
              Pensummit samler fag, forelæsninger, noter, begreber og eksamensinfo for din
              studiegruppe — så I kan bruge tiden på at lære i stedet for at lede.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={tilFunktioner}
                className="inline-flex items-center gap-2 rounded-lg bg-steel px-5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90"
              >
                Se hvad Pensummit kan
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => setLoginAaben(true)}
                className="label-mono rounded-full bg-steel-soft px-4 py-2.5 normal-case tracking-normal text-steel transition-colors hover:bg-steel/20"
              >
                Jeg har allerede adgang
              </button>
            </div>
          </div>
        </section>

        {/* Funktioner */}
        <section id="funktioner" className={`${INDHOLD} scroll-mt-24 pt-12 sm:pt-20`}>
          <Afsnit>
            <p className="label-mono">Funktioner</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Hele semesteret på ét sted
            </h2>
            <p className="mt-3 max-w-[56ch] text-base text-ink-soft">
              Eksemplerne herunder viser appens rigtige skærmbilleder med tal fra et typisk
              semester.
            </p>
          </Afsnit>

          <Afsnit className="mt-10">
            <FunktionsTekst
              nummer="01"
              titel="Semesteroverblik med eksamensnedtælling"
              beskrivelse="Forsiden viser altid den næste eksamen, hvor langt der er til den, og hvor meget af semesteret I har været igennem — hentet direkte fra jeres kalender."
            />
            <div className="mt-6">
              <MockSemesteroverblik />
            </div>
          </Afsnit>

          <Funktion
            nummer="02"
            titel="Fagkort med status og fremgang"
            beskrivelse="Hvert fag har sit eget kort med ECTS, eksamensform og to fremgangsbjælker: afholdte forelæsninger og øvelsestimer. Ét klik åbner faget med lektionsplan, litteratur og noter."
            mock={<MockFagkort />}
          />

          <Funktion
            nummer="03"
            titel="Studienoter genereret fra slides"
            beskrivelse="Forelæsningsslides bliver automatisk til strukturerede noter med resumé, nøglebegreber og indbyggede quizspørgsmål — klar til repetition dagen før eksamen."
            spejlvendt
            mock={<MockStudienote />}
          />

          <Funktion
            nummer="04"
            titel="Søgbar begrebsbank på tværs af fag"
            beskrivelse="Alle begreber fra semesterets noter samles ét sted med definition, fag og forelæsningsreference. Søg frit, filtrér på fag, og eksportér udvalget som Markdown."
            mock={<MockBegreber />}
          />

          <Funktion
            nummer="05"
            titel="Kalender og Canvas i samme visning"
            beskrivelse="Dagens skema og de nærmeste afleveringer står side om side, så I ved præcis hvad der sker i dag — og hvad der venter i næste uge."
            spejlvendt
            mock={<MockKalender />}
          />
        </section>

        {/* Integrationer */}
        <section className={`${INDHOLD} pt-16 sm:pt-24`}>
          <Afsnit>
            <p className="label-mono">Integrationer</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Bygget oven på det I bruger i forvejen
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <IntegrationsKort
                ikon={<GraduationCap className="size-5" />}
                navn="Canvas LMS"
                beskrivelse="Henter automatisk opgaver, afleveringsfrister og indleveringsstatus fra jeres kurser."
              />
              <IntegrationsKort
                ikon={<CalendarDays className="size-5" />}
                navn="Google Calendar / ICS"
                beskrivelse="Synkroniserer skemaet, så forelæsninger og øvelsestimer tæller med i fremgangen."
              />
              <IntegrationsKort
                ikon={<Sparkles className="size-5" />}
                navn="AI-genererede noter"
                beskrivelse="Forelæsningsslides bliver til studienoter med resumé, begreber og quizspørgsmål."
              />
              <IntegrationsKort
                ikon={<ShieldCheck className="size-5" />}
                navn="Supabase"
                beskrivelse="Realtidsdata og sikker autentificering — kun inviterede medlemmer har adgang."
              />
            </div>
          </Afsnit>
        </section>

        {/* Hvem er det til */}
        <section className={`${INDHOLD} pt-16 sm:pt-24`}>
          <Afsnit>
            <div className="panel p-6 sm:p-10">
              <p className="label-mono">Hvem er det til</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Studiegrupper der vil have styr på semesteret
              </h2>
              <div className="mt-6 grid gap-6 text-base leading-relaxed text-ink-soft sm:grid-cols-3">
                <p>
                  Pensummit er lavet til læsegrupper, der deler pensum, noter og
                  eksamensforberedelse — ikke til den enkelte studerende alene.
                </p>
                <p>
                  Lige nu kører det for en CBS HA(it)-gruppe på 3. semester med tre fag, fælles
                  noter og delt kalender.
                </p>
                <p>
                  Fag, lektionsplaner og eksamensformer er data — så opsætningen kan tilpasses andre
                  studieretninger og semestre.
                </p>
              </div>
            </div>
          </Afsnit>
        </section>

        {/* Kontakt */}
        <section className={`${INDHOLD} pt-16 sm:pt-24`}>
          <Afsnit>
            <div className="rounded-2xl border border-steel/20 bg-steel/10 p-6 sm:p-10">
              <p className="label-mono">Adgang</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Vil du have adgang?
              </h2>
              <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-soft">
                Pensummit er et lukket værktøj uden selv-oprettelse. Skriv til os, hvis du vil
                inviteres til en eksisterende gruppe, eller hvis du vil have Pensummit sat op til
                din egen studieretning.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${KONTAKT_MAIL}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-steel px-5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90"
                >
                  <Mail className="size-4" />
                  {KONTAKT_MAIL}
                </a>
                <button
                  onClick={() => setLoginAaben(true)}
                  className="label-mono rounded-full bg-steel-soft px-4 py-2.5 normal-case tracking-normal text-steel transition-colors hover:bg-steel/20"
                >
                  Log ind
                </button>
              </div>
            </div>
          </Afsnit>
        </section>
      </main>

      <footer className="mt-16 border-t border-line py-10 sm:mt-24">
        <div className={`${INDHOLD} flex flex-wrap items-center justify-between gap-6`}>
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-steel font-display text-base font-semibold text-surface">
              P
            </span>
            <div>
              <p className="font-display text-base font-semibold leading-none tracking-tight">
                Pensummit
              </p>
              <p className="mt-1 text-xs text-ink-soft">Bygget af fire CBS HA(it)-studerende</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://www.cbs.dk"
              target="_blank"
              rel="noopener noreferrer"
              className="label-mono normal-case tracking-normal transition-colors hover:text-ink"
            >
              CBS
            </a>
            <span className="label-mono normal-case tracking-normal">
              © {new Date().getFullYear()}
            </span>
            <TemaKnap tema={tema} onSkift={() => setTema(skiftTema())} />
          </div>
        </div>
      </footer>

      {loginAaben && <LoginModal onClose={() => setLoginAaben(false)} />}
    </div>
  );
}

function TemaKnap({ tema, onSkift }: { tema: Tema; onSkift: () => void }) {
  return (
    <button
      onClick={onSkift}
      aria-label={tema === "dark" ? "Skift til lyst tema" : "Skift til mørkt tema"}
      className="grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:text-ink"
    >
      {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

// Toner indhold ind første gang det scrolles i syne.
function Afsnit({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [synlig, setSynlig] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSynlig(true);
      return;
    }
    const observer = new IntersectionObserver(
      (poster) => {
        if (poster.some((p) => p.isIntersecting)) {
          setSynlig(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`toner-ind ${synlig ? "synlig" : ""} ${className}`}>
      {children}
    </div>
  );
}

function FunktionsTekst({
  nummer,
  titel,
  beskrivelse,
}: {
  nummer: string;
  titel: string;
  beskrivelse: string;
}) {
  return (
    <div>
      <p className="label-mono">Funktion {nummer}</p>
      <h3 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">
        {titel}
      </h3>
      <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-ink-soft">{beskrivelse}</p>
    </div>
  );
}

function Funktion({
  nummer,
  titel,
  beskrivelse,
  mock,
  spejlvendt = false,
}: {
  nummer: string;
  titel: string;
  beskrivelse: string;
  mock: ReactNode;
  spejlvendt?: boolean;
}) {
  return (
    <Afsnit className="mt-14 sm:mt-20">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className={spejlvendt ? "md:order-2" : ""}>
          <FunktionsTekst nummer={nummer} titel={titel} beskrivelse={beskrivelse} />
        </div>
        <div className={spejlvendt ? "md:order-1" : ""}>{mock}</div>
      </div>
    </Afsnit>
  );
}

function IntegrationsKort({
  ikon,
  navn,
  beskrivelse,
}: {
  ikon: ReactNode;
  navn: string;
  beskrivelse: string;
}) {
  return (
    <div className="panel flex gap-4 p-5 sm:p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-steel-soft text-steel">
        {ikon}
      </span>
      <div>
        <p className="text-base font-semibold tracking-tight">{navn}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{beskrivelse}</p>
      </div>
    </div>
  );
}

/* ---------- Mockvisninger: hardcoded eksempeldata, ingen API-kald ---------- */

function Bjaelke({
  label,
  forbi,
  total,
  farve = "bg-steel",
}: {
  label: string;
  forbi: number;
  total: number;
  farve?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((forbi / total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="font-mono">
          {forbi} / {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${farve}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MockSemesteroverblik() {
  return (
    <div className="rounded-2xl border border-steel/20 bg-steel/10 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <p className="font-display text-2xl font-bold tracking-tight text-steel sm:text-3xl">
          Makroøkonomi
        </p>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="font-display text-5xl font-bold text-steel sm:text-6xl">47</p>
            <p className="label-mono mt-1">Dage</p>
          </div>
          <div className="text-center">
            <p className="font-display text-5xl font-bold text-steel sm:text-6xl">7</p>
            <p className="label-mono mt-1">Uger</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">Skriftlig 4-timers sit-in · 15. januar 2027</p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <Bjaelke label="Forelæsninger" forbi={8} total={14} />
        <Bjaelke label="Øvelsestimer" forbi={5} total={12} />
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        I dag: Makroøkonomi kl. 08.00, Computernetværk kl. 10.00
      </p>
    </div>
  );
}

const MOCK_FAG = [
  {
    navn: "IT-forandringsledelse",
    ects: 7.5,
    eksamensform: "Mundtlig",
    periode: "december",
    farve: "var(--clay)",
    forelaesninger: { forbi: 9, total: 13 },
    ovelser: { forbi: 6, total: 10 },
  },
  {
    navn: "Computernetværk og datasikkerhed",
    ects: 7.5,
    eksamensform: "Skriftlig",
    periode: "januar",
    farve: "var(--sage)",
    forelaesninger: { forbi: 7, total: 12 },
    ovelser: { forbi: 4, total: 11 },
  },
  {
    navn: "Makroøkonomi",
    ects: 7.5,
    eksamensform: "Skriftlig 4-timer",
    periode: "januar",
    farve: "var(--steel)",
    forelaesninger: { forbi: 8, total: 14 },
    ovelser: { forbi: 5, total: 12 },
  },
];

function MockFagkort() {
  return (
    <div className="space-y-4">
      {MOCK_FAG.map((f) => (
        <div key={f.navn} className="panel block border-l-4 p-5" style={{ borderColor: f.farve }}>
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-base font-semibold leading-tight tracking-tight">{f.navn}</h4>
            <span className="label-mono shrink-0 rounded-full bg-steel-soft px-2 py-0.5 text-[10px] normal-case tracking-normal text-steel">
              {f.eksamensform}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {f.ects} ECTS · Eksamen {f.periode}
          </p>
          <div className="mt-3 space-y-2">
            <Bjaelke
              label="Forelæsninger"
              forbi={f.forelaesninger.forbi}
              total={f.forelaesninger.total}
            />
            <Bjaelke label="Øvelsestimer" forbi={f.ovelser.forbi} total={f.ovelser.total} />
          </div>
        </div>
      ))}
    </div>
  );
}

const MOCK_NOTEBEGREBER = [
  {
    navn: "Unfreeze",
    definition:
      "Fasen hvor den nuværende ligevægt brydes op, og organisationen gøres modtagelig for forandring.",
  },
  {
    navn: "Change",
    definition:
      "Selve omstillingen, hvor nye arbejdsgange og systemer indføres og afprøves i praksis.",
  },
  {
    navn: "Refreeze",
    definition:
      "Stabilisering af den nye tilstand, så adfærden fastholdes efter projektet er afsluttet.",
  },
  {
    navn: "Kraftfeltanalyse",
    definition:
      "Kortlægning af drivende og modvirkende kræfter for at vurdere en forandrings gennemførlighed.",
  },
];

function MockStudienote() {
  return (
    <div className="panel p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="label-mono">Forelæsning 3 · IT-forandringsledelse</p>
        <span className="label-mono shrink-0 whitespace-nowrap rounded-full bg-sage-soft px-2.5 py-1 text-[10px] normal-case tracking-normal text-sage">
          Auto-genereret
        </span>
      </div>
      <h4 className="mt-2 font-display text-xl font-semibold tracking-tight">
        Lewins forandringsmodeller
      </h4>

      <div className="mt-5 text-sm leading-relaxed text-ink">
        <p className="label-mono">Resume</p>
        <p className="mt-2 text-ink-soft">
          Forelæsningen introducerer Lewins tre-fasede model som grundlag for planlagt forandring og
          stiller den op mod nyere, mere kontinuerlige perspektiver. Kraftfeltanalysen bruges til at
          vurdere, hvornår en organisation reelt er klar til at ændre praksis.
        </p>

        <p className="label-mono mt-5">Nøglebegreber</p>
        <ul className="mt-2 space-y-2">
          {MOCK_NOTEBEGREBER.map((b) => (
            <li key={b.navn} className="text-ink-soft">
              <strong className="font-semibold text-ink">{b.navn}</strong> — {b.definition}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Genereret ud fra forelæsningens slides · 4 begreber tilføjet til begrebsbanken
      </p>
    </div>
  );
}

const MOCK_BEGREBER = [
  {
    navn: "Kraftfeltanalyse",
    fag: "IT-forandringsledelse",
    definition:
      "Model der vejer drivende kræfter op mod modstand for at vurdere en forandrings gennemførlighed.",
    kilde: "Forelæsning 3: Lewins forandringsmodeller",
  },
  {
    navn: "Subnetmaske",
    fag: "Computernetværk",
    definition:
      "Bitmaske der adskiller netværksdelen fra hostdelen i en IP-adresse og afgrænser broadcastdomænet.",
    kilde: "Forelæsning 5: IP-adressering",
  },
  {
    navn: "Multiplikatoreffekt",
    fag: "Makroøkonomi",
    definition:
      "Den samlede ændring i BNP, som følger af en initial ændring i de autonome udgifter.",
    kilde: "Forelæsning 2: Den keynesianske model",
  },
  {
    navn: "TLS-handshake",
    fag: "Computernetværk",
    definition:
      "Indledende udveksling hvor klient og server aftaler cipher suite og etablerer sessionsnøgler.",
    kilde: "Forelæsning 7: Transportlagssikkerhed",
  },
];

function MockBegreber() {
  return (
    <div className="space-y-4">
      <div className="panel space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line">
          <Search className="size-4 shrink-0 text-ink-soft" />
          <span className="text-ink-soft">Søg i begreber og definitioner…</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="label-mono rounded-full bg-steel px-2.5 py-1 text-surface">
            Alle fag
          </span>
          {["IT-forandringsledelse", "Computernetværk", "Makroøkonomi"].map((f) => (
            <span
              key={f}
              className="label-mono rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {MOCK_BEGREBER.map((b) => (
        <div key={b.navn} className="panel p-5">
          <p className="font-display text-lg font-semibold tracking-tight">{b.navn}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{b.definition}</p>
          <p className="label-mono mt-3 normal-case tracking-normal">
            {b.fag} · {b.kilde}
          </p>
        </div>
      ))}
    </div>
  );
}

const MOCK_TIMER = [
  {
    tid: "08.00–09.40",
    fag: "Makroøkonomi",
    type: "Forelæsning",
    lokale: "SP215",
  },
  {
    tid: "10.00–11.40",
    fag: "Computernetværk",
    type: "Øvelsestimer",
    lokale: "SPs07",
  },
  {
    tid: "13.00–14.40",
    fag: "IT-forandringsledelse",
    type: "Forelæsning",
    lokale: "Online",
  },
];

const MOCK_OPGAVER = [
  {
    titel: "Aflevering 2 — Subnetberegning",
    fag: "Computernetværk",
    frist: "24. sep 23.59",
    mangler: false,
  },
  {
    titel: "Case-oplæg: ERP-implementering",
    fag: "IT-forandringsledelse",
    frist: "1. okt 12.00",
    mangler: true,
  },
];

function MockKalender() {
  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <p className="label-mono tracking-[0.18em]">I dag i kalenderen</p>
        <ul className="mt-3 space-y-2">
          {MOCK_TIMER.map((t) => (
            <li key={t.tid} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="label-mono normal-case tracking-normal">{t.tid}</span>
              <span className="font-medium">{t.fag}</span>
              <span className="text-ink-soft">{t.type}</span>
              <span className="text-ink-soft">· {t.lokale}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-6">
        <p className="label-mono tracking-[0.18em]">Kommende afleveringer</p>
        <ul className="mt-3 divide-y divide-line">
          {MOCK_OPGAVER.map((o) => (
            <li key={o.titel} className="flex items-baseline justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{o.titel}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {o.fag}
                  {o.mangler && <span className="ml-2 text-clay">· Mangler</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="label-mono normal-case tracking-normal">{o.frist}</span>
                <span className="label-mono shrink-0 rounded-full bg-steel-soft px-2.5 py-1 normal-case tracking-normal text-steel">
                  Åbn
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
