# AETHER TCG: The Fifth Element

AETHER TCG is a web-based trading card game with a dark fantasy aesthetic, animated cards, deck building, campaign mode, pack opening, PvP lobby, social features, shop systems, and Firebase integration. The project was exported from Firebase Studio and is structured as a Next.js app so it can be developed locally and outside Firebase Studio.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Internationalization](#internationalization)
- [Firebase](#firebase)
- [Local Development](#local-development)
- [Build and Checks](#build-and-checks)
- [Important Data Models](#important-data-models)
- [Assets and Audio](#assets-and-audio)
- [Firebase Studio Export](#firebase-studio-export)
- [Deployment](#deployment)
- [Development Notes](#development-notes)
- [Troubleshooting](#troubleshooting)
- [License and Rights](#license-and-rights)

## Overview

The game revolves around tactical card duels using cards from the `AWAKENING` set. Players build decks, collect cards, open boosters, choose starter decks or custom decks, and compete against AI opponents, campaign bosses, or other players.

Main game areas:

- Authentication and user profile
- Main menu with access to play, shop, set, collection, and deck sections
- Card collection with filtering and sorting functions
- Deck builder and starter decks
- AI match, campaign, tutorial, and PvP
- Pack shop and animated pack opening
- Cosmetic shop, avatars, frames, card backs, coins, and playmats
- Marketplace and social/friends system
- Persistence through Firebase Auth and Firestore
- Multilingual UI with English, German, and Spanish

## Features

### Card Game

- Cards with the following types: `Unit`, `Spell`, `Trap`, `Aether`, `Relic`
- Elements: Fire, Water, Earth, Air, Aether, Physical
- Rarities: Common, Uncommon, Rare, Epic, Legendary, GOD
- Combat phases, blocking, direct damage, focus abilities, overcharge, and trigger effects
- Interactive game log with card references
- Animated card view and video effects

### Game Modes

- **Quick Play / AI Match**: Duels against AI using starter decks or custom decks
- **Campaign**: Mission chain against boss opponents such as Kael, Mireya, Obryn, Sileth, Aerion, and Aurex
- **Tutorial**: Guided introduction to the core mechanics
- **PvP Online**: Firebase-based lobby, rooms, deck selection, and shared game state

### Collection and Deck Building

- Local and cloud-backed player progression
- Card inventory, gold, merits, XP, level, wins, and losses
- Starter decks and custom saved decks
- Deck rules and validation in the deck builder

### Shops and Progression

- Gold shop
- Cosmetic shop
- Booster packs for the `AWAKENING` set
- Pack probabilities and animated reveal sequence
- Marketplace for card offers between players

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19, TypeScript, Tailwind CSS
- **Components**: Radix UI, Lucide Icons, custom game components
- **State and Logic**: React Context, Immer, local game-state models
- **Drag & Drop**: React DnD
- **Animations**: Framer Motion, CSS animations, video assets
- **Backend/Cloud**: Firebase Auth, Firestore, Firebase App Hosting
- **AI/Studio Context**: Genkit and Firebase Studio export files

## Project Structure

```text
.
├── src/
│   ├── app/                 # Next.js App Router pages and layouts
│   ├── components/          # Header, footer, cards, game UI, UI building blocks
│   ├── context/             # App and audio providers
│   ├── firebase/            # Firebase initialization, providers, hooks, error handling
│   ├── hooks/               # Toast and mobile hooks
│   ├── i18n/                # Languages, provider, translation helpers
│   ├── lib/                 # Cards, decks, missions, effects, types, assets
│   └── ai/                  # Genkit/Firebase Studio AI entry point
├── public/                  # Card images, videos, music, sounds, UI assets
├── docs/                    # Firebase Studio blueprint
├── firestore.rules          # Firestore security rules
├── apphosting.yaml          # Firebase App Hosting configuration
├── next.config.ts           # Next.js configuration
└── package.json             # Scripts and dependencies
```

## Internationalization

The app supports:

- English (`en`) as the default and fallback language
- German (`de`)
- Spanish (`es`)

Localization is stored in:

```text
src/i18n/index.tsx
src/i18n/locales/en.ts
src/i18n/locales/de.ts
src/i18n/locales/es.ts
src/components/LanguageSwitcher.tsx
```

The i18n system:

- stores the selected language in `localStorage` under `aether-language`
- restores the stored language on reload
- falls back to English for unknown language values
- updates the client-side `<html lang="">` attribute
- localizes UI text, card display, deck display, mission display, elements, rarities, and game-log text

Important: Internal IDs, card values, deck lists, mission IDs, routes, and game logic remain language-independent and stable.

## Firebase

The project uses Firebase for:

- Authentication
- User profiles
- Inventory and progression
- Friend requests and friendships
- Marketplace listings
- PvP rooms and synchronized game state

Relevant files:

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

The export contains a Firebase web-app configuration in `src/firebase/config.ts`. Firebase Web API keys are public client configuration values, but in production projects they should be protected through the Firebase Console, App Check, domain restrictions, and security rules. For your own Firebase project, replace the values in `src/firebase/config.ts` or use your own environment strategy.

Typical Firebase placeholders:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Note: The current Firebase initialization first tries automatic App Hosting initialization and falls back locally to the exported configuration.

## Local Development

Requirements:

- Node.js 20 or compatible
- npm
- Access to a Firebase project if Auth/Firestore should be used fully

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

The app runs by default at:

```text
http://localhost:3000
```

If port `3000` is already in use, stop the running process or manually start Next.js on another port.

## Build and Checks

Production build on macOS/Linux:

```bash
npm run build
```

Production build on Windows PowerShell:

```powershell
$env:NODE_ENV='production'; npx next build
```

Additional scripts:

```bash
npm run start
npm run typecheck
npm run lint
npm run genkit:dev
npm run genkit:watch
```

Notes:

- `next.config.ts` ignores TypeScript and ESLint errors during the Next.js build (`ignoreBuildErrors`, `ignoreDuringBuilds`).
- `npm run build` uses Unix-style `NODE_ENV=production` syntax. On Windows PowerShell, use the Windows command shown above.
- `npm run typecheck` may show existing project-wide type errors that are independent of the runtime build.

## Important Data Models

Core game data is stored in:

```text
src/lib/cards.ts       # MASTER_DB with card data
src/lib/decks.ts       # Starter decks
src/lib/missions.ts    # Campaign missions and enemy decks
src/lib/effects.ts     # Card, combat, and effect logic
src/lib/types.ts       # TypeScript types for cards, game state, combat, logs
src/lib/cosmetics.ts   # Cosmetic items
```

Important for further development:

- Do not change card IDs, because they are referenced by decks, inventory, effects, and localization.
- Change card values, costs, effects, and deck lists only intentionally, because they directly affect balancing.
- Element values such as `Feuer`, `Wasser`, `Erde`, `Luft`, `Aether`, and `Physisch` may be used in logic and data. Use the i18n helpers for UI display.
- Maintain user-facing text through `src/i18n`; do not duplicate it directly inside components.

## Assets and Audio

All visual and audio assets are stored under `public/`.

Examples:

- `public/cards/` and `public/cards/videos/` for card images and card animations
- `public/mission/` for campaign opponents
- `public/set/awakening/` for booster-pack graphics
- `public/ui/thumbnail/` and `public/ui/background/` for menu and loading screens
- `public/*.mp3` for music, combat, card, UI, and effect sounds
- `public/cosmetics/`, `public/avatar/`, `public/emotes/`, `public/ranks/` for profile and social assets

Asset filenames are part of the data references and should not be changed without matching code updates.

## Firebase Studio Export

The project contains Firebase Studio/App Hosting metadata:

```text
firebase-blueprint.json
firebase-applet-config.json
apphosting.yaml
docs/blueprint.md
metadata.json
```

The app still runs as a normal Next.js project. Firebase Studio-specific files should not be removed if the project is intended to be used again in Firebase Studio or Firebase App Hosting.

## Deployment

For Firebase App Hosting:

1. Configure the Firebase project.
2. Review and deploy the Firestore rules from `firestore.rules`.
3. Provision the App Hosting backend using `apphosting.yaml`.
4. Check the Firebase web configuration.
5. Run a production build.

For other hosting providers:

1. Run the Next.js build.
2. Provide the Firebase client configuration.
3. Configure the auth domain and allowed domains in Firebase.
4. Deploy Firestore rules in the Firebase project.

## Development Notes

- Existing game mechanics are tightly connected to card IDs, deck lists, and effect functions.
- The UI and game board use many animations, videos, and absolute asset paths.
- Changes to game-state types should be aligned with `src/lib/effects.ts`, `GameBoard.tsx`, `GameBoardMission.tsx`, and PvP synchronization.
- New visible text should always be added to all three locale files.
- New cards should be added not only to `MASTER_DB`, but also to localizations, assets, and effect logic where needed.

## Troubleshooting

### Firebase reports missing options locally

The initialization first tries Firebase App Hosting. Locally, a warning may appear and the app may then fall back to `src/firebase/config.ts`. Check the Firebase configuration, auth domain, and Firestore access.

### Build does not work on Windows with `npm run build`

The script entry uses `NODE_ENV=production`. In PowerShell, use:

```powershell
$env:NODE_ENV='production'; npx next build
```

### Lint asks for setup

The export may not contain a complete ESLint configuration. Add a lint configuration intentionally before using linting as a CI requirement.

### Typecheck shows many errors

`next.config.ts` skips TypeScript errors during the Next.js build. Therefore, `npm run typecheck` may expose existing type inconsistencies even though the production build compiles successfully.

### Card images or videos are missing

Check the paths in `src/lib/cards.ts`, `src/lib/decks.ts`, `src/lib/missions.ts`, and `public/`. Asset names and paths must match exactly.

## License and Rights

This repository contains game code, graphics, audio, and video assets for AETHER TCG. Before publication or redistribution, ownership, license, and usage rights for the included assets should be reviewed.
