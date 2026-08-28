# Pensum Companion

Pensummit v2 — prompt til Lovable

Kopiér teksten nedenfor (eller sektioner ad gangen) ind i Lovable's chat for at bygge fundamentet. Byg gerne i denne rækkefølge: (1) datamodel, (2) auth, (3) sider/UI. Lovable klarer selv React/Vite/Tailwind-frontend og Supabase-backend — det behøver du ikke bede om eksplicit.

1. Projektbeskrivelse (start her)

Byg en app kaldet "Pensummit" — et samlet overblik for et CBS HA(it)-semester over fag, eksamensformer, litteratur, begreber og studiefremgang. Appen er til en lille, lukket gruppe studiekammerater (ikke offentlig).

Sprog i UI: dansk. Design: enkelt, roligt, læsevenligt — det er et studieværktøj, ikke en marketing-side. Mobilvenligt, da det skal bruges mellem forelæsninger.

2. Datamodel (bed Lovable oprette disse Supabase-tabeller)

fag

id (uuid, PK)

navn (text)

ects (numeric)

eksamensform (text)

eksamensperiode (text, fx "vinter")

semester (text, fx "forår 2026")

forelaesning

id (uuid, PK)

fag_id (FK → fag.id)

nummer (int)

dato (date)

emne (text)

note_url (text) — link til den statiske HTML-note på GitHub Pages

begreb

id (uuid, PK)

fag_id (FK → fag.id)

forelaesning_id (FK → forelaesning.id, kan være tom)

navn (text)

definition (text)

litteratur

id (uuid, PK)

fag_id (FK → fag.id)

titel (text)

forfatter (text)

type (text, fx "bog", "artikel", "link")

url (text, kan være tom)

fremgang

id (uuid, PK)

bruger_id (FK → auth.users.id)

forelaesning_id (FK → forelaesning.id)

status (text: "ikke startet" / "gennemgået" / "repeteret")

opdateret_dato (timestamp)

3. Adgang og login

Brug Supabase Auth med e-mail/password. Ingen selv-registrering — kun jeg (admin) kan invitere nye brugere til gruppen. Alle godkendte brugere kan læse og redigere fag, forelaesning, begreb og litteratur (delt data). I fremgang må en bruger kun se og redigere sine egne rækker (row-level security på bruger_id = auth.uid()).

4. Sider

Dashboard (forside) Liste over fag i det aktuelle semester som kort, hver med: navn, ECTS, eksamensform, og en lille fremgangsbar (hvor mange forelæsninger er markeret "gennemgået" for mig). Øverst: nedtælling til nærmeste eksamensdato på tværs af fag.

Fag-side Info om ECTS, eksamensform og eksamensperiode øverst. Herunder en liste over forelæsninger (nummer, dato, emne) — hver med et link "åbn note" der åbner note_url i nyt vindue, og en dropdown/toggle til at sætte min egen status (ikke startet / gennemgået / repeteret). Nederst: litteraturliste for faget med links.

Begreber (på tværs af fag) Søgbar liste over alle begreber, med filter på fag. Hvert begreb viser navn, definition og hvilket fag/hvilken forelæsning det hører til.

Admin: tilføj forelæsning En simpel formular til at tilføje en ny forelæsning til et fag (fag, nummer, dato, emne, note_url) — bruges hver gang der genereres en ny HTML-note, så den kan linkes ind.

5. Eksempeldata

Opret 1 eksempelfag med 2-3 forelæsninger, 3-4 begreber og 2 litteraturposter, så UI'et er testbart med det samme.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pensum-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/788da996-a56b-467b-b705-edb937b5f8b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
