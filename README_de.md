# AETHER TCG: The Fifth Element

AETHER TCG ist ein webbasiertes Trading Card Game mit dunkler Fantasy-Ästhetik, animierten Karten, Deckbau, Kampagne, Pack-Opening, PvP-Lobby, Social-Funktionen, Shop-Systemen und Firebase-Anbindung. Das Projekt wurde aus Firebase Studio exportiert und ist als Next.js-App so aufgebaut, dass es lokal und außerhalb von Firebase Studio weiterentwickelt werden kann.

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Projektstruktur](#projektstruktur)
- [Mehrsprachigkeit](#mehrsprachigkeit)
- [Firebase](#firebase)
- [Lokale Entwicklung](#lokale-entwicklung)
- [Build und Checks](#build-und-checks)
- [Wichtige Datenmodelle](#wichtige-datenmodelle)
- [Assets und Audio](#assets-und-audio)
- [Firebase Studio Export](#firebase-studio-export)
- [Troubleshooting](#troubleshooting)

## Überblick

Das Spiel dreht sich um taktische Duelle mit Karten aus dem Set `AWAKENING`. Spieler bauen Decks, sammeln Karten, öffnen Booster, wählen Starter-Decks oder eigene Decks und treten gegen KI-Gegner, Kampagnenbosse oder andere Spieler an.

Wichtige Spielbereiche:

- Authentifizierung und Nutzerprofil
- Hauptmenü mit Spiel-, Shop-, Set-, Collection- und Deck-Zugängen
- Kartenkollektion mit Filter- und Sortierfunktionen
- Deck Builder und Starter-Decks
- KI-Match, Kampagne, Tutorial und PvP
- Pack-Shop und animiertes Pack-Opening
- Kosmetik-Shop, Avatare, Frames, Card Backs, Coins und Playmats
- Marketplace und Social/Friends-System
- Persistenz über Firebase Auth und Firestore
- Mehrsprachige UI mit Englisch, Deutsch und Spanisch

## Features

### Card Game

- Karten mit Typen: `Unit`, `Spell`, `Trap`, `Aether`, `Relic`
- Elemente: Feuer, Wasser, Erde, Luft, Aether, Physisch
- Seltenheiten: Common, Uncommon, Rare, Epic, Legendary, GOD
- Kampfphasen, Blocken, Direktschaden, Fokus-Fähigkeiten, Overcharge und Trigger-Effekte
- Interaktives Spielprotokoll mit Kartenreferenzen
- Animierte Kartenansicht und Videoeffekte

### Spielmodi

- **Quick Play / AI Match**: Duelle gegen KI mit Starter- oder eigenen Decks
- **Campaign**: Missionsreihe gegen Bossgegner wie Kael, Mireya, Obryn, Sileth, Aerion und Aurex
- **Tutorial**: Geführter Einstieg in Grundmechaniken
- **PvP Online**: Firebase-basierte Lobby, Räume, Deckauswahl und gemeinsamer Spielzustand

### Sammlung und Deckbau

- Lokale und cloudgestützte Spielerprogression
- Karteninventar, Gold, Merits, XP, Level, Siege und Niederlagen
- Starter-Decks und selbst gespeicherte Decks
- Deckregeln und Validierung im Deck Builder

### Shops und Progression

- Gold-Shop
- Kosmetik-Shop
- Booster-Packs für das Set `AWAKENING`
- Pack-Wahrscheinlichkeiten und animierte Reveal-Sequenz
- Marketplace für Kartenangebote zwischen Spielern

## Tech Stack

- **Framework**: Next.js 15 mit App Router
- **UI**: React 19, TypeScript, Tailwind CSS
- **Komponenten**: Radix UI, Lucide Icons, eigene Game-Komponenten
- **State und Logik**: React Context, Immer, lokale Game-State-Modelle
- **Drag & Drop**: React DnD
- **Animationen**: Framer Motion, CSS Animationen, Video-Assets
- **Backend/Cloud**: Firebase Auth, Firestore, Firebase App Hosting
- **AI/Studio-Kontext**: Genkit und Firebase Studio Export-Dateien

## Projektstruktur

```text
.
├── src/
│   ├── app/                 # Next.js App Router Seiten und Layouts
│   ├── components/          # Header, Footer, Karten, Game UI, UI-Bausteine
│   ├── context/             # App- und Audio-Provider
│   ├── firebase/            # Firebase Initialisierung, Provider, Hooks, Fehlerhandling
│   ├── hooks/               # Toast und Mobile Hooks
│   ├── i18n/                # Sprachen, Provider, Übersetzungshelfer
│   ├── lib/                 # Karten, Decks, Missionen, Effekte, Typen, Assets
│   └── ai/                  # Genkit/Firebase Studio AI-Einstieg
├── public/                  # Kartenbilder, Videos, Musik, Sounds, UI-Assets
├── docs/                    # Firebase Studio Blueprint
├── firestore.rules          # Firestore Security Rules
├── apphosting.yaml          # Firebase App Hosting Konfiguration
├── next.config.ts           # Next.js Konfiguration
└── package.json             # Scripts und Dependencies
```

## Mehrsprachigkeit

Die App unterstützt:

- Englisch (`en`) als Standard- und Fallback-Sprache
- Deutsch (`de`)
- Spanisch (`es`)

Die Lokalisierung liegt in:

```text
src/i18n/index.tsx
src/i18n/locales/en.ts
src/i18n/locales/de.ts
src/i18n/locales/es.ts
src/components/LanguageSwitcher.tsx
```

Das i18n-System:

- speichert die ausgewählte Sprache in `localStorage` unter `aether-language`
- stellt beim Reload die gespeicherte Sprache wieder her
- fällt bei unbekannten Sprachwerten auf Englisch zurück
- aktualisiert clientseitig das `<html lang="">` Attribut
- lokalisiert UI-Texte, Kartenanzeige, Deckanzeige, Missionsanzeige, Elemente, Seltenheiten und Game-Log-Texte

Wichtig: Interne IDs, Kartenwerte, Decklisten, Mission-IDs, Routen und Spiellogik bleiben sprachunabhängig stabil.

## Firebase

Das Projekt nutzt Firebase für:

- Authentifizierung
- Nutzerprofile
- Inventar und Progression
- Friend Requests und Friendships
- Marketplace Listings
- PvP-Räume und synchronisierten Spielzustand

Relevante Dateien:

```text
src/firebase/config.ts
src/firebase/index.ts
src/firebase/provider.tsx
src/firebase/client-provider.tsx
src/firebase/firestore/use-doc.tsx
src/firebase/firestore/use-collection.tsx
firestore.rules
apphosting.yaml
```

Der Export enthält eine Firebase Web-App-Konfiguration in `src/firebase/config.ts`. Firebase Web API Keys sind öffentliche Client-Konfigurationswerte, sollten aber in produktiven Projekten über Firebase Console, App Check, Domain-Restriktionen und Security Rules abgesichert werden. Für ein eigenes Firebase-Projekt die Werte in `src/firebase/config.ts` bzw. über eine eigene Environment-Strategie ersetzen.

Typische Firebase-Platzhalter:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Hinweis: Die aktuelle Firebase-Initialisierung versucht zuerst die automatische App-Hosting-Initialisierung und fällt lokal auf die exportierte Konfiguration zurück.

## Lokale Entwicklung

Voraussetzungen:

- Node.js 20 oder kompatibel
- npm
- Zugriff auf ein Firebase-Projekt, falls Auth/Firestore vollständig genutzt werden sollen

Installation:

```bash
npm ci
```

Dev-Server starten:

```bash
npm run dev
```

Die App läuft standardmäßig auf:

```text
http://localhost:3000
```

Falls Port `3000` belegt ist, entweder den laufenden Prozess stoppen oder Next.js manuell auf einem anderen Port starten.

## Build und Checks

Produktions-Build unter macOS/Linux:

```bash
npm run build
```

Produktions-Build unter Windows PowerShell:

```powershell
$env:NODE_ENV='production'; npx next build
```

Weitere Scripts:

```bash
npm run start
npm run typecheck
npm run lint
npm run genkit:dev
npm run genkit:watch
```

Hinweise:

- `next.config.ts` ignoriert TypeScript- und ESLint-Fehler während des Next.js Builds (`ignoreBuildErrors`, `ignoreDuringBuilds`).
- `npm run build` nutzt eine Unix-artige `NODE_ENV=production` Schreibweise. Unter Windows PowerShell daher den oben genannten Windows-Befehl verwenden.
- `npm run typecheck` kann bestehende projektweite Typfehler anzeigen, die unabhängig vom Runtime-Build sind.

## Wichtige Datenmodelle

Zentrale Spieldaten liegen in:

```text
src/lib/cards.ts       # MASTER_DB mit Kartendaten
src/lib/decks.ts       # StarterDecks
src/lib/missions.ts    # Kampagnenmissionen und Gegnerdecks
src/lib/effects.ts     # Karten-, Kampf- und Effektlogik
src/lib/types.ts       # TypeScript-Typen für Karten, Spielzustand, Combat, Logs
src/lib/cosmetics.ts   # Kosmetik-Items
```

Wichtig für Weiterentwicklung:

- Karten-IDs nicht ändern, da sie für Decks, Inventar, Effekte und Lokalisierung referenziert werden.
- Kartenwerte, Kosten, Effekte und Decklisten nur bewusst ändern, da sie direkt das Balancing beeinflussen.
- Elementwerte wie `Feuer`, `Wasser`, `Erde`, `Luft`, `Aether`, `Physisch` können in Logik und Daten genutzt werden. Für UI-Anzeigen die i18n-Helfer verwenden.
- User-facing Texte über `src/i18n` pflegen, nicht hart in Komponenten duplizieren.

## Assets und Audio

Alle visuellen und akustischen Assets liegen unter `public/`.

Beispiele:

- `public/cards/` und `public/cards/videos/` für Kartenbilder und Kartenanimationen
- `public/mission/` für Kampagnengegner
- `public/set/awakening/` für Booster-Pack-Grafiken
- `public/ui/thumbnail/` und `public/ui/background/` für Menü- und Ladebildschirme
- `public/*.mp3` für Musik, Kampf-, Karten-, UI- und Effekt-Sounds
- `public/cosmetics/`, `public/avatar/`, `public/emotes/`, `public/ranks/` für Profil- und Social-Assets

Asset-Dateinamen sind Teil der Datenreferenzen und sollten nicht ohne passende Code-Anpassung geändert werden.

## Firebase Studio Export

Das Projekt enthält Firebase Studio/App Hosting Metadaten:

```text
firebase-blueprint.json
firebase-applet-config.json
apphosting.yaml
docs/blueprint.md
metadata.json
```

Die App ist dennoch als normales Next.js-Projekt lauffähig. Firebase Studio-spezifische Dateien sollten nicht entfernt werden, wenn das Projekt wieder in Firebase Studio oder Firebase App Hosting genutzt werden soll.

## Deployment

Für Firebase App Hosting:

1. Firebase-Projekt konfigurieren.
2. Firestore Rules aus `firestore.rules` prüfen und deployen.
3. App Hosting Backend anhand von `apphosting.yaml` bereitstellen.
4. Firebase-Webkonfiguration prüfen.
5. Produktions-Build ausführen.

Für andere Hosting-Anbieter:

1. Next.js Build ausführen.
2. Firebase-Clientkonfiguration bereitstellen.
3. Auth-Domain und erlaubte Domains in Firebase konfigurieren.
4. Firestore Rules im Firebase-Projekt deployen.

## Entwicklungshinweise

- Bestehende Spielmechaniken sind eng mit Karten-IDs, Decklisten und Effektfunktionen verbunden.
- UI und Game Board nutzen viele Animationen, Videos und absolute Asset-Pfade.
- Änderungen an Game-State-Typen sollten mit `src/lib/effects.ts`, `GameBoard.tsx`, `GameBoardMission.tsx` und PvP-Synchronisierung abgeglichen werden.
- Neue sichtbare Texte sollten immer in alle drei Locale-Dateien eingetragen werden.
- Neue Karten sollten neben `MASTER_DB` auch Lokalisierungen, Assets und ggf. Effektlogik erhalten.

## Troubleshooting

### Firebase meldet lokal fehlende Optionen

Die Initialisierung versucht zuerst Firebase App Hosting. Lokal kann eine Warnung erscheinen und anschließend auf `src/firebase/config.ts` zurückfallen. Prüfe Firebase-Konfiguration, Auth-Domain und Firestore-Zugriff.

### Build funktioniert unter Windows nicht mit `npm run build`

Der Script-Eintrag verwendet `NODE_ENV=production`. Nutze in PowerShell:

```powershell
$env:NODE_ENV='production'; npx next build
```

### Lint fragt nach Einrichtung

Der Export enthält möglicherweise keine vollständige ESLint-Konfiguration. Eine Lint-Konfiguration sollte bewusst ergänzt werden, bevor Linting als CI-Anforderung genutzt wird.

### Typecheck zeigt viele Fehler

`next.config.ts` überspringt TypeScript-Fehler beim Next.js Build. `npm run typecheck` kann deshalb bestehende Typinkonsistenzen sichtbar machen, obwohl der Produktions-Build erfolgreich kompiliert.

### Kartenbilder oder Videos fehlen

Prüfe die Pfade in `src/lib/cards.ts`, `src/lib/decks.ts`, `src/lib/missions.ts` und `public/`. Asset-Namen und Pfade müssen exakt übereinstimmen.

## Lizenz und Rechte

Dieses Repository enthält Spielcode, Grafiken, Audio- und Videoassets für AETHER TCG. Vor Veröffentlichung oder Weitergabe sollten Eigentums-, Lizenz- und Nutzungsrechte der enthaltenen Assets geprüft werden.
