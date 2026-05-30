
import type { Mission } from './types';

export const missions: Mission[] = [
    {
        id: 'kael',
        title: 'Kael, der Gebrochene',
        description: 'Ein gefallener Krieger, geplagt von den Schatten seiner Vergangenheit.',
        coverImg: '/mission/kael.jpg',
        videoSrc: '/mission/kael.mp4',
        hint: 'dark warrior',
        opponentName: 'Kael',
        opponentImage: '/mission/kael.jpg',
        deck: [
          // Units (20)
          { id: 3, count: 3 },  // Ashwalker
          { id: 2, count: 3 },  // Gladiator
          { id: 5, count: 2 },  // Tinkerer
          { id: 4, count: 2 },  // Flamebounder
          { id: 9, count: 2 },  // Barbarossa
          { id: 6, count: 1 },  // Tristan
          { id: 7, count: 1 },  // Soburin
          { id: 1, count: 1 },  // Inferno Drake
          { id: 8, count: 1 },  // Kael
          // Spells/Traps (10)
          { id: 10, count: 3 }, // Fireburst
          { id: 11, count: 2 }, // Overheat
          { id: 12, count: 1 }, // Scorching Wave
          { id: 14, count: 3 }, // Flamethrower
          { id: 15, count: 1 }, // Backdraft
          // Aether (10)
          { id: 80, count: 8 }, // Aether Source
          { id: 83, count: 2 }, // Aether Cave
        ]
    },
     {
        id: 'mireya',
        title: 'Mireya, die Flutruferin',
        description: 'Eine Meisterin der Wasser-Magie, die die Gezeiten selbst befehligt.',
        prerequisite: 'kael',
        coverImg: '/mission/mireya.jpg',
        videoSrc: '/mission/mireya.mp4',
        hint: 'water mage',
        opponentName: 'Mireya',
        opponentImage: '/mission/mireya.jpg',
        deck: [
            // Units
            { id: 18, count: 3 }, // Icewalker
            { id: 17, count: 3 }, // Ice Nomad
            { id: 25, count: 3 }, // Icebound Defender
            { id: 19, count: 2 }, // Deepsea Guardian
            { id: 20, count: 2 }, // Frostveil Siren
            { id: 24, count: 1 }, // Water Elementar
            { id: 21, count: 1 }, // Wavecaller Oracle
            { id: 23, count: 1 }, // Mireya
             // Spells/Traps
            { id: 26, count: 3 }, // Freeze Current
            { id: 28, count: 3 }, // Tidal Recall
            { id: 30, count: 2 }, // Sudden Undertow
            { id: 29, count: 2 }, // Calm the Depths
            { id: 27, count: 2 }, // Counterflow
            // Aether
            { id: 80, count: 8 },
            { id: 84, count: 2 },
        ]
    },
    {
        id: 'obryn',
        title: 'OBRYN, DER TITAN',
        description: 'Ein uralter Titan aus Stein, dessen Herz zu Fels erstarrt ist.',
        prerequisite: 'mireya',
        coverImg: '/mission/obryn.jpg',
        videoSrc: '/mission/obryn.mp4',
        hint: 'stone titan',
        opponentName: 'Obryn',
        opponentImage: '/mission/obryn.jpg',
        deck: [
            // Units
            { id: 51, count: 3 }, // Grove Stalker
            { id: 52, count: 3 }, // Lifebloom Druid
            { id: 53, count: 3 }, // Verdant Warden
            { id: 54, count: 2 }, // Golem
            { id: 55, count: 2 }, // Behemoth
            { id: 57, count: 1 }, // Ancient Treant
            { id: 56, count: 1 }, // Obryn
             // Spells/Traps
            { id: 58, count: 3 }, // Regrowth
            { id: 59, count: 3 }, // Entangling Roots
            { id: 62, count: 2 }, // Thorn Snare
            { id: 63, count: 2 }, // Natural Retaliation
            // Aether
            { id: 80, count: 8 },
            { id: 82, count: 2 },
        ]
    },
    {
        id: 'sileth',
        title: 'Sileth, Klinge der Umbras',
        description: 'Ein mysteriöses Wesen, schnell, tödlich und voller magischer Kräfte.',
        prerequisite: 'obryn',
        coverImg: '/mission/sileth.jpg',
        videoSrc: '/mission/sileth.mp4',
        hint: 'shadow assassin',
        opponentName: 'Sileth',
        opponentImage: '/mission/sileth.jpg',
        deck: [
            // Units
            { id: 33, count: 3 }, // Aether Initiate
            { id: 34, count: 3 }, // Flux Adept
            { id: 35, count: 3 }, // Aether Channeler
            { id: 36, count: 2 }, // Aether Guardian
            { id: 37, count: 2 }, // Aether Titan
            { id: 40, count: 1 }, // Aether Dragon
            { id: 38, count: 1 }, // Sileth
            // Spells/Traps
            { id: 43, count: 3 }, // Fifth Portal
            { id: 46, count: 3 }, // Aether Drain
            { id: 47, count: 2 }, // Temporal Chamber
            { id: 48, count: 2 }, // Echo of Aether
            // Aether
            { id: 80, count: 8 },
            { id: 85, count: 2 },
        ]
    },
    {
        id: 'aerion',
        title: 'AERION, WÄCHTER DES HIMMELS',
        description: 'Ein himmlischer Krieger, der die Wolken durchstreift und mit der Macht des Sturms zuschlägt.',
        prerequisite: 'sileth',
        coverImg: '/mission/aerion.jpg',
        videoSrc: '/mission/aerion.mp4',
        hint: 'sky warrior',
        opponentName: 'Aerion',
        opponentImage: '/mission/aerion.jpg',
        deck: [
             // Units
            { id: 65, count: 3 }, // Sparkblade Rogue
            { id: 66, count: 3 }, // Storm Elementar
            { id: 67, count: 3 }, // Stormrunner
            { id: 69, count: 2 }, // Chainblade Adept
            { id: 70, count: 1 }, // Arc Striker
            { id: 68, count: 1 }, // Kira
            { id: 71, count: 1 }, // AERION
            // Spells/Traps
            { id: 72, count: 3 }, // Lightning Bolt
            { id: 73, count: 2 }, // Air Temple
            { id: 75, count: 2 }, // Protective Wind
            { id: 77, count: 3 }, // Static Trap
            { id: 74, count: 1 }, // Chain Lightning
            // Aether
            { id: 80, count: 8 },
            { id: 81, count: 2 },
        ]
    },
    {
        id: 'aurex',
        title: 'Aurex, der Weltenformer',
        description: 'Ein kosmisches Wesen mit der Macht, Realitäten zu formen.',
        prerequisite: 'aerion',
        coverImg: '/mission/aurex.jpg',
        videoSrc: '/mission/aurex.mp4',
        hint: 'cosmic entity',
        opponentName: 'Aurex',
        opponentImage: '/mission/aurex.jpg',
        deck: [
          // Units
          { id: 1, count: 1 },  // Inferno Drake
          { id: 22, count: 1 },  // Zoa
          { id: 57, count: 1 }, // Ancient Treant
          { id: 68, count: 1 }, // Kira
          { id: 36, count: 2 }, // Aether Guardian
          { id: 37, count: 2 }, // Aether Titan
          { id: 40, count: 1 }, // Aether Dragon
          { id: 41, count: 1 }, // Aurex
          // Spells/Traps
          { id: 13, count: 2 }, // Last Spark
          { id: 27, count: 2 }, // Counterflow
          { id: 45, count: 1 }, // Rewrite Fate
          { id: 61, count: 2 }, // Nature's Balance
          { id: 74, count: 2 }, // Chain Lightning
          { id: 48, count: 2 }, // Echo of Aether
          { id: 78, count: 2 }, // Sandstorm
          // Aether
          { id: 80, count: 2 }, 
          { id: 81, count: 2 }, 
          { id: 82, count: 2 }, 
          { id: 83, count: 2 }, 
          { id: 84, count: 2 }, 
        ]
    },
];
