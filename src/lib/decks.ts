


import { Swords, Shield, Zap } from "lucide-react";

export type DeckStats = {
    strength: number;
    defense: number;
    tempo: number;
}

export type Deck = {
    id: number;
    name: string;
    description: string;
    style: string;
    element: "Feuer" | "Wasser" | "Aether" | "Erde" | "Luft";
    img: string;
    img_hint: string;
    cards: { id: number; count: number }[];
    stats: DeckStats;
};

export const StarterDecks: Deck[] = [
  {
    id: 1,
    name: "Flammen des Umsturzes",
    description: "Ein aggressives Deck, das auf schnellen Schaden und mächtige Burst-Effekte setzt, um den Gegner zu überrennen.",
    style: "Aggro / Burst",
    element: "Feuer",
    img: "/deck/starter-fire.png",
    img_hint: "fire chaos",
    stats: { strength: 90, defense: 20, tempo: 75 },
    cards: [
      // Units (20)
      { id: 3, count: 3 },  // Ashwalker
      { id: 2, count: 3 },  // Gladiator
      { id: 5, count: 3 },  // Tinkerer
      { id: 4, count: 3 },  // Flamebounder
      { id: 9, count: 2 },  // Barbarossa
      { id: 6, count: 1 },  // Tristan
      { id: 7, count: 1 },  // Soburin
      { id: 1, count: 1 },  // Inferno Drake
      // Spells/Traps (10)
      { id: 10, count: 3 }, // Fireburst
      { id: 11, count: 2 }, // Overheat
      { id: 12, count: 1 }, // Scorching Wave
      { id: 14, count: 3 }, // Flamethrower
      { id: 15, count: 1 }, // Backdraft
      // Aether (10)
      { id: 80, count: 5 }, // Aether Source
      { id: 83, count: 3 }, // Aether Cave
      { id: 81, count: 2 }, // Bound Aether
    ],
  },
  {
    id: 2,
    name: "Tiefen der Stille",
    description: "Ein kontrollierendes Deck, das das Spiel verlangsamt, gegnerische Aktionen stört und durch überlegenen Wert gewinnt.",
    style: "Control / Tempo",
    element: "Wasser",
    img: "/deck/starter-water.png",
    img_hint: "deep water",
    stats: { strength: 30, defense: 85, tempo: 40 },
    cards: [
      // Units (18)
      { id: 18, count: 3 }, // Icewalker
      { id: 17, count: 3 }, // Ice Nomad
      { id: 25, count: 3 }, // Icebound Defender
      { id: 19, count: 3 }, // Deepsea Guardian
      { id: 20, count: 3 }, // Frostveil Siren
      { id: 24, count: 2 }, // Water Elementar
      { id: 21, count: 1 }, // Wavecaller Oracle
      // Spells/Traps (12)
      { id: 26, count: 3 }, // Freeze Current
      { id: 28, count: 3 }, // Tidal Recall
      { id: 30, count: 2 }, // Sudden Undertow
      { id: 29, count: 2 }, // Calm the Depths
      { id: 27, count: 2 }, // Counterflow
      // Aether (10)
      { id: 80, count: 5 }, // Aether Source
      { id: 84, count: 3 }, // Disruptive Aether
      { id: 81, count: 2 }, // Bound Aether
    ],
  },
  {
    id: 3,
    name: "Der Fünfte Kreis",
    description: "Ein flexibles Midrange-Deck, das das Aether-System manipuliert, um mächtige Meta-Effekte zu entfesseln.",
    style: "Midrange / Meta-Control",
    element: "Aether",
    img: "/deck/starter-aether.png",
    img_hint: "magic energy",
    stats: { strength: 60, defense: 60, tempo: 60 },
    cards: [
        // Units (20)
        { id: 33, count: 3 }, // Aether Initiate
        { id: 34, count: 3 }, // Flux Adept
        { id: 35, count: 3 }, // Aether Channeler
        { id: 36, count: 2 }, // Aether Guardian
        { id: 39, count: 2 }, // Kai
        { id: 38, count: 1 }, // Sileth
        { id: 37, count: 3 }, // Aether Titan
        { id: 40, count: 1 }, // Aether Dragon
        // Spells/Traps (10)
        { id: 43, count: 3 }, // Fifth Portal
        { id: 46, count: 3 }, // Aether Drain
        { id: 47, count: 2 }, // Temporal Chamber
        { id: 48, count: 2 }, // Echo of Aether
        // Aether (10)
        { id: 80, count: 5 }, // Aether Source
        { id: 82, count: 3 }, // Aether Potion
        { id: 85, count: 2 }, // Ascended Aether
    ],
  },
   {
    id: 4,
    name: "Wurzeln des Erwachens",
    description: "Ein stabiles Deck, das über Zeit ein starkes Board aufbaut und sich durch Heilung gegen aggressive Decks behauptet.",
    style: "Midrange / Board-Aufbau",
    element: "Erde",
    img: "/deck/starter-earth.png",
    img_hint: "nature forest",
    stats: { strength: 50, defense: 70, tempo: 50 },
    cards: [
        // Units (20)
        { id: 50, count: 3 }, // Seedling Swarm
        { id: 51, count: 3 }, // Grove Stalker
        { id: 52, count: 3 }, // Lifebloom Druid
        { id: 53, count: 3 }, // Verdant Warden
        { id: 54, count: 2 }, // Golem
        { id: 55, count: 2 }, // Behemoth
        { id: 57, count: 1 }, // Ancient Treant
        // Spells/Traps (10)
        { id: 58, count: 3 }, // Regrowth
        { id: 59, count: 3 }, // Entangling Roots
        { id: 62, count: 2 }, // Thorn Snare
        { id: 63, count: 2 }, // Natural Retaliation
        // Aether (10)
        { id: 80, count: 5 }, // Aether Source
        { id: 82, count: 5 }, // Aether Potion
    ],
  },
  {
    id: 5,
    name: "Schlag des Moments",
    description: "Ein schnelles Tempo-Deck, das durch günstige Spells und Mehrfachaktionen versucht, den Gegner schnell zu überwältigen.",
    style: "Tempo / Combo",
    element: "Luft",
    img: "/deck/starter-air.png",
    img_hint: "lightning storm",
    stats: { strength: 70, defense: 30, tempo: 95 },
    cards: [
        // Units (20)
        { id: 65, count: 3 }, // Sparkblade Rogue
        { id: 66, count: 3 }, // Storm Elementar
        { id: 67, count: 3 }, // Stormrunner
        { id: 69, count: 2 }, // Chainblade Adept
        { id: 70, count: 1 }, // Arc Striker
        { id: 68, count: 1 }, // Kira
        { id: 33, count: 3 }, // Aether Initiate (for tempo)
        // Spells/Traps (10)
        { id: 72, count: 3 }, // Lightning Bolt
        { id: 73, count: 2 }, // Air Temple
        { id: 75, count: 2 }, // Protective Wind
        { id: 77, count: 3 }, // Static Trap
        // Aether (10)
        { id: 80, count: 5 }, // Aether Source
        { id: 81, count: 5 }, // Bound Aether
    ],
  },
];

