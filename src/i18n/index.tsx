'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CardData, Element, Rarity, CardType, Mission } from '@/lib/types';
import type { Deck } from '@/lib/decks';
import type { CosmeticItem } from '@/lib/cosmetics';
import en from './locales/en';
import de from './locales/de';
import es from './locales/es';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type TranslationKey = keyof typeof en.ui;
type GameTextKey = keyof typeof en.logText;

const STORAGE_KEY = 'aether-language';
const DEFAULT_LANGUAGE: Language = 'en';

const dictionaries = {
  en,
  de,
  es,
} as const;

export const languageLabels: Record<Language, string> = {
  en: 'EN',
  de: 'DE',
  es: 'ES',
};

export function normalizeLanguage(value: unknown): Language {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as Language)
    ? (value as Language)
    : DEFAULT_LANGUAGE;
}

function format(template: string, values?: Record<string, string | number>) {
  if (!values) return template;
  return Object.entries(values).reduce(
    (next, [key, value]) => next.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function getDictionary(language: Language) {
  return dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
}

export function translate(language: Language, key: TranslationKey, values?: Record<string, string | number>) {
  const dictionary = getDictionary(language);
  const value = dictionary.ui[key] ?? dictionaries[DEFAULT_LANGUAGE].ui[key] ?? key;
  return format(value, values);
}

export function translateCardType(language: Language, type: CardType) {
  return getDictionary(language).cardTypes[type] ?? dictionaries.en.cardTypes[type] ?? type;
}

export function translateElement(language: Language, element: Element) {
  return getDictionary(language).elements[element] ?? dictionaries.en.elements[element] ?? element;
}

export function translateRarity(language: Language, rarity: Rarity) {
  return getDictionary(language).rarities[rarity] ?? dictionaries.en.rarities[rarity] ?? rarity;
}

export function localizeCard<T extends CardData>(card: T, language: Language): T {
  if (language === 'de') return card;
  const cardTranslation = (getDictionary(language).cards as Record<number, Partial<CardData>>)[card.id];
  if (!cardTranslation) return card;
  return { ...card, ...cardTranslation };
}

export function localizeDeck<T extends Deck>(deck: T, language: Language): T {
  if (language === 'de') return deck;
  const deckTranslation = (getDictionary(language).decks as Record<number, Partial<Deck>>)[deck.id];
  if (!deckTranslation) return deck;
  return { ...deck, ...deckTranslation };
}

export function localizeMission<T extends Mission>(mission: T, language: Language): T {
  if (language === 'de') return mission;
  const missionTranslation = (getDictionary(language).missions as Record<string, Partial<Mission>>)[mission.id];
  if (!missionTranslation) return mission;
  return { ...mission, ...missionTranslation };
}

export function localizeCosmetic<T extends CosmeticItem>(item: T, language: Language): T {
  const name = (getDictionary(language).cosmetics as Record<string, string>)[item.id]
    ?? (dictionaries[DEFAULT_LANGUAGE].cosmetics as Record<string, string>)[item.id]
    ?? item.name;
  return { ...item, name };
}

const exactGameText: Record<string, GameTextKey> = {
  ' lässt dich eine Karte ziehen.': 'drawsCard',
  ' fügt dem Gegner 1 Schaden zu.': 'dealsOneToOpponent',
  ' reduziert den Schaden.': 'damageReduced',
  ' reduziert den erlittenen Schaden.': 'takenDamageReduced',
  ' wird durch die Heilung stärker.': 'healStronger',
  ' wurde zerstört.': 'destroyed',
  ' erhält 1 Fokus durch den Tod von ': 'gainsFocusFromDeath',
  "'s letzter Wille... Wähle ein Ziel für 1 Schaden.": 'lastWillTarget',
  ' fügt ': 'deals',
  ' Schaden zu ': 'damageTo',
  ' 1 Schaden zu.': 'oneDamage',
  ' fügt dem gegnerischen Spieler 1 Schaden zu.': 'oneDamageToPlayer',
  "'s Effekt wurde ausgelöst. Wähle ein Ziel für 1 Schaden.": 'abilityTriggeredTarget',
  'Diese Einheit hat ihre Fokus-Fähigkeit diesen Zug bereits genutzt.': 'focusUsed',
  ' aktiviert seine Fähigkeit.': 'activatesAbility',
  'Ungültiges Ziel für Tinkerer.': 'invalidTargetTinkerer',
  ' erhält +1 Angriff für diese Runde.': 'gainsAttackRound',
  'Erhalte 1 Aether': 'gainAetherOption',
  'Füge deinem Vorrat 1 Aether hinzu.': 'gainAetherDescription',
  'Zauberkosten reduzieren': 'reduceCostOption',
  'Der nächste Zauber in diesem Zug kostet 1 weniger.': 'reduceCostDescription',
  'Ultimate: Zerstöre alle Einheiten ≤3 Kosten': 'ultimateOption',
  'Du verlierst 1 HP pro zerstörter Einheit. Kosten: 4 Fokus.': 'ultimateDescription',
  'Einheit schwächen': 'debuffOption',
  'Eine Einheit erhält -2 ATK. Kosten: 1 Fokus.': 'debuffDescription',
  'Schatten beschwören': 'summonShadowOption',
  'Beschwöre einen 1/1 Schatten. Kosten: 1 Fokus.': 'summonShadowDescription',
  'Wähle eine gegnerische Einheit, die eingefroren werden soll.': 'chooseEnemyFreeze',
  'Keine Ziele für ': 'noTargetsFor',
  ' gewährt 1 Aether.': 'grantsAether',
  'Wähle eine gegnerische Einheit mit Kosten 3 oder weniger, die verbannt werden soll.': 'chooseEnemyBanish',
  'Keine gültigen Ziele für ': 'noValidTargetsFor',
  ' beschwört einen 1/1 Parasit.': 'summonsParasite',
  'Kein Platz für einen Parasit.': 'noRoomParasite',
  'Wähle ein Ziel für ': 'chooseTargetFor',
  'Wähle eine angreifende Einheit für ': 'chooseAttackerFor',
  "'s Falle wurde ausgelöst!": 'trapTriggered',
  'Falle wurde ausgelöst durch ': 'trapTriggeredBy',
  'Der nächste Schadenseffekt wird um 2 verstärkt.': 'nextDamageBoosted',
  'Du ziehst eine Karte.': 'drawCard',
  'Wähle zwei Einheiten, um ihre Kosten zu tauschen.': 'chooseTwoUnitsCostSwap',
  ' gewährt 2 Aether.': 'grantsTwoAether',
  ' zerstört alle Einheiten mit Relikten.': 'destroysRelicUnits',
  ' setzt das Spielfeld zurück.': 'resetsBoard',
  ' stärkt ': 'buffsPlusTwo',
  'Die nächste Einheit hat Eile.': 'nextUnitHaste',
  'Wähle bis zu 3 Ziele für Kettenblitz.': 'chooseChainLightning',
  ' schützt ': 'protects',
  'Du kannst nur in deiner Hauptphase Karten ausspielen.': 'onlyMainPhase',
  'Du kannst nur eine Aether-Karte pro Zug spielen.': 'oneAetherPerTurn',
  ' hat das Spiel gewonnen!': 'gameWonBy',
  ' hat keine Karten mehr und verliert!': 'noCardsLose',
  'Keine Angriffe deklariert. Zug wird beendet.': 'noAttacksEnd',
  'Du kannst diesen Zug nicht angreifen.': 'cannotAttackTurn',
  'Kein Platz für eine neue Einheit.': 'noRoomUnit',
  'Kein Platz für eine neue Aether-Karte.': 'noRoomAether',
  'Kein Platz für eine neue Fallenkarte.': 'noRoomTrap',
  'Wähle eine gegnerische Einheit.': 'chooseEnemyUnit',
  'Du musst eine gegnerische Einheit auswählen.': 'mustChooseEnemyUnit',
  'Ungültiges Ziel. Wähle eine angreifende Einheit.': 'invalidTargetAttacker',
  'Ungültiges Ziel. Wähle eine Einheit mit Kosten 3 oder weniger.': 'invalidTargetCost',
  'Ungültiges Ziel.': 'invalidTarget',
  'Diese Einheit kann nicht blocken.': 'cannotBlock',
  'Stormrunner kann nicht von Einheiten mit Kosten 3 oder weniger geblockt werden.': 'stormrunnerBlock',
  ' greift nun den Gegner an.': 'attacksOpponent',
  'Diese Einheit ist eingefroren.': 'frozenUnit',
  'Diese Einheit ist gefesselt.': 'entangledUnit',
  'Diese Einheit hat geblockt und ist erschöpft.': 'blockedExhausted',
  'Diese Einheit kann nicht angreifen.': 'cannotAttack',
  'Du kannst verdeckte Karten nicht inspizieren.': 'faceDownInspect',
  'Aether Spirit gewährt 3 Aether. Du kannst diesen Zug weder angreifen noch Zauber wirken.': 'aetherSpiritGrant',
  'Aether Reactor gewährt 3 Aether.': 'aetherReactorGrant',
  'Du kannst nur Einheiten für Aether Shift auswählen.': 'onlyUnitsAetherShift',
  'Wähle eine gegnerische Einheit zum Schwächen.': 'weakEnemyUnit',
  'Kein Platz für einen Schatten.': 'noRoomShadow',
  ' legt eine verdeckte Karte.': 'concealedCard',
  'Du hast 100 Merits für deinen Sieg erhalten!': 'victoryMeritsLog',
  'Gegner greift nicht an.': 'opponentDoesNotAttack',
  'Overcharge fügt ': 'overchargeDeals',
  ' erhält 1 Fokus durch den Angriff.': 'attackFocus',
  ' fügt +2 Bonusschaden zu.': 'bonusDamage',
  ' erhöht deinen Aether-Vorrat.': 'increasesAetherPool',
  ' ist eingefroren und überspringt diesen Zug.': 'frozenSkipTurn',
  ' blockiert nun ': 'blocksNow',
  ' hat bereits 2 Einheiten geblockt und ist nun erschöpft.': 'alreadyBlockedExhausted',
  'Diese Einheit hat ihre Fähigkeit diesen Zug bereits genutzt.': 'usedAbilityTurn',
  // High-traffic log connectors. The game log builds messages from text-part arrays like
  // `[{player}, ' spielt ', {card}, '.']` — each text part is fed through translateGameText
  // individually, so the connector strings must each be matchable on their own.
  ' spielt ': 'playsConnector',
  'Kampfphase beginnt.': 'combatPhaseBegins',
  'Du kannst nicht blocken.': 'cannotBlockAny',
  'Du kannst nicht mehr blocken.': 'cannotBlockAnymore',
  'Alle Angriffe wurden gestoppt.': 'allAttacksStopped',
  ' deklariert einen Angriff.': 'declaresAttack',
  "'s ": 'possessiveConnector',
  "'s": 'apostrophePossessive',
  ' wurde gestoppt.': 'attackStoppedConnector',
  'Der Angriff von ': 'attackOfPrefix',
  "'s Aura verhindert den Angriff von ": 'auraPreventsAttack',
  ' ist unverwundbar und erleidet keinen Schaden.': 'invulnerableNoDamage',
  "'s Wut steigert seinen Angriff.": 'rageBoostsAttack',
  'Verdant Wardens Effekt endet.': 'verdantWardenEnds',
  'Verdant Warden(s) geben ': 'wardensGiveHp',
  ' +1 Fokus.': 'plusFocusSuffix',
  'Kai heilt dich um 1 HP.': 'kaiHealsOne',
  ' zerstört alle gegnerischen Fallenkarten.': 'destroysEnemyTraps',
  ' wird in 1 Zug wiederbelebt...': 'revivedInOneTurn',
  ' friert ': 'freezesConnector',
  ' ein.': 'freezesSuffix',
  ' permanent.': 'permanentSuffix',
  ' reduziert den Angriff von ': 'reducesAttackOf',
  "'s Effekt.": 'effectSuffix',
  'Nicht genug Fokus auf ': 'notEnoughFocusOn',
  '.': 'periodSuffix',
  ' lässt ': 'nextSkipsTurn',
  ' den nächsten Zug überspringen.': 'skipNextTurnSuffix',
  ' verhindert den Angriff von ': 'attackPreventedFor',
  ' gibt anderen Feuer-Einheiten +1 ATK.': 'feuerUnitBuff',
  ' gibt ': 'boundAetherGives',
  'Du hast dich entschieden, nicht zu blocken.': 'chosenNotBlocked',
  ' hat sich entschieden, ': 'chosenNotActivate',
  ' nicht zu aktivieren.': 'notActivateSuffix',
  ' wurde wiederbelebt!': 'revivedFromGraveyard',
  "'s Fähigkeit.": 'abilitySuffix',
  ' beschwört einen 1/1 Schatten.': 'summonsShadow',
  'Parasit wird von ': 'parasiteBuffPrefix',
  ' absorbiert und verleiht +1/+1.': 'parasiteBuffMid',
  'Die Münze wird ausgeführt.': 'coinIsBeingTossed',
  'Der Wurf wird ausgeführt.': 'coinIsBeingTossed',
  'Das Duell beginnt!': 'duelStartsNow',
  ' neutralisiert ': 'counterflowNeutralizes',
  'Diese Einheit hat bereits ein Relikt.': 'unitHasRelicAlready',
  'Wähle ein Ziel für den kopierten Zauber ': 'chooseCopiedSpellTarget',
};

const gameTextPatterns: Array<{ match: RegExp; key: GameTextKey; values: (match: RegExpMatchArray) => Record<string, string | number> }> = [
  { match: /^Overheat verstärkt den Schaden um (.+)\.$/, key: 'overheatBoost', values: (match) => ({ amount: match[1] }) },
  { match: /^Nicht genug Aether: benötigt (.+), hast (.+)\.$/, key: 'notEnoughAether', values: (match) => ({ needed: match[1], current: match[2] }) },
  { match: /^ verhindert (.+) Schaden\.$/, key: 'preventsDamage', values: (match) => ({ amount: match[1] }) },
  { match: /^ greift .* direkt an für (.+) Schaden!$/, key: 'directAttack', values: (match) => ({ damage: match[1] }) },
  { match: /^(.+) kann Blocker deklarieren\.$/, key: 'canDeclareBlockers', values: (match) => ({ player: match[1] }) },
  { match: /^ wurde für (.+) Aether überladen \(Kosten: (.+)\)\. Neuer Angriff: (.+)\.$/, key: 'overchargedLog', values: (match) => ({ amount: match[1], cost: match[2], attack: match[3] }) },
  { match: /^'s Ultimate zerstört (.+) Einheiten und heilt um .+\.$/, key: 'ultimateDestroysHeals', values: (match) => ({ count: match[1] }) },
  // Numeric/dynamic log fragments
  { match: /^ Zug (\d+)\.$/, key: 'turnLabel', values: (match) => ({ turn: match[1] }) },
  { match: /^(.+) Zug (\d+)\.$/, key: 'playerTurnLabel', values: (match) => ({ player: match[1], turn: match[2] }) },
  { match: /^ (\d+) Schaden zu\.$/, key: 'damageAmount', values: (match) => ({ damage: match[1] }) },
  { match: /^ erleidet (\d+) Schaden\.$/, key: 'takesDamage', values: (match) => ({ damage: match[1] }) },
  { match: /^ fügt allen gegnerischen Einheiten (\d+) Schaden zu\.$/, key: 'dealsAllEnemyUnits', values: (match) => ({ damage: match[1] }) },
  { match: /^ fügt allen Einheiten (\d+) Schaden zu\.$/, key: 'dealsAllUnits', values: (match) => ({ damage: match[1] }) },
  { match: /^Der Angriff von .+ wurde gestoppt\.$/, key: 'attackStoppedConnector', values: () => ({}) },
  { match: /^ \+(\d+) HP\.$/, key: 'plusHpSuffix', values: (match) => ({ amount: match[1] }) },
  { match: /^Ancient Treant\(s\) heilen dich um (\d+)\.$/, key: 'treantsHeal', values: (match) => ({ amount: match[1] }) },
  { match: /^Die Münze zeigt: (.+)$/, key: 'coinShowsResult', values: (match) => ({ side: match[1] }) },
  { match: /^(.+) hat (.+) gewählt\.\.\.$/, key: 'chosenSide', values: (match) => ({ player: match[1], side: match[2] }) },
];

// Last-resort word/phrase substitutions. Run in order, so put MORE SPECIFIC compound
// phrases above the single-word fallbacks they would otherwise shadow.
const fallbackGameReplacements: Array<[RegExp, string, string]> = [
  // Multi-word phrases (most specific first)
  [/erhöht deinen Aether-Vorrat/g, 'increases your Aether pool', 'aumenta tu reserva de Aether'],
  [/ist eingefroren und überspringt diesen Zug/g, 'is frozen and skips this turn', 'está congelada y salta este turno'],
  [/ist unverwundbar und erleidet keinen Schaden/g, 'is invulnerable and takes no damage', 'es invulnerable y no recibe daño'],
  [/reduziert die Kosten des nächsten Zaubers/g, 'reduces the cost of the next spell', 'reduce el coste del próximo hechizo'],
  [/reduziert den erlittenen Schaden/g, 'reduces incoming damage', 'reduce el daño recibido'],
  [/reduziert den Schaden/g, 'reduces the damage', 'reduce el daño'],
  [/wird durch die Heilung stärker/g, 'becomes stronger from the healing', 'se hace más fuerte con la curación'],
  [/lässt dich eine Karte ziehen/g, 'lets you draw a card', 'te hace robar una carta'],
  [/erhält 1 Fokus durch den Angriff/g, 'gains 1 Focus from the attack', 'gana 1 Focus por el ataque'],
  [/erhält 1 Fokus durch den Tod von/g, 'gains 1 Focus from the death of', 'gana 1 Focus por la muerte de'],
  [/Du kannst nur in deiner Hauptphase Karten ausspielen/g, 'You can only play cards during your main phase', 'Solo puedes jugar cartas en tu fase principal'],
  [/Du kannst nur eine Aether-Karte pro Zug spielen/g, 'You can only play one Aether card per turn', 'Solo puedes jugar una carta de Aether por turno'],
  [/Du kannst nicht mehr blocken/g, 'You can no longer block', 'Ya no puedes bloquear'],
  [/Du kannst nicht blocken/g, 'You cannot block', 'No puedes bloquear'],
  [/Du kannst verdeckte Karten nicht inspizieren/g, 'You cannot inspect face-down cards', 'No puedes inspeccionar cartas boca abajo'],
  [/Du musst eine gegnerische Einheit auswählen/g, 'You must choose an enemy unit', 'Debes elegir una unidad enemiga'],
  [/Du kannst diesen Zug nicht angreifen/g, 'You cannot attack this turn', 'No puedes atacar este turno'],
  [/Du hast 100 Merits für deinen Sieg erhalten/g, 'You received 100 Merits for your victory', 'Recibiste 100 Merits por tu victoria'],
  [/legt eine verdeckte Karte/g, 'plays a face-down card', 'juega una carta boca abajo'],
  [/legt eine Aether-Quelle/g, 'plays an Aether Source', 'juega una fuente de Aether'],
  [/beschwört einen 1\/1 Schatten/g, 'summons a 1/1 Shadow', 'invoca una Sombra 1/1'],
  [/beschwört einen 1\/1 Parasit/g, 'summons a 1/1 Parasite', 'invoca un Parásito 1/1'],
  [/Kein Platz für einen Parasit/g, 'No room for a Parasite', 'No hay espacio para un Parásito'],
  [/Kein Platz für einen Schatten/g, 'No room for a Shadow', 'No hay espacio para una Sombra'],
  [/Kein Platz für eine neue Einheit/g, 'No room for a new unit', 'No hay espacio para una nueva unidad'],
  [/Kein Platz für eine neue Aether-Karte/g, 'No room for a new Aether card', 'No hay espacio para una nueva carta de Aether'],
  [/Kein Platz für eine neue Fallenkarte/g, 'No room for a new trap card', 'No hay espacio para una nueva carta de trampa'],
  [/Keine Angriffe deklariert\. Zug wird beendet/g, 'No attacks declared. Turn ends', 'Sin ataques declarados. El turno termina'],
  [/Keine gültigen Ziele für/g, 'No valid targets for', 'Sin objetivos válidos para'],
  [/Keine Ziele für/g, 'No targets for', 'Sin objetivos para'],
  [/Aether Spirit gewährt 3 Aether/g, 'Aether Spirit grants 3 Aether', 'Aether Spirit otorga 3 Aether'],
  [/Aether Reactor gewährt 3 Aether/g, 'Aether Reactor grants 3 Aether', 'Aether Reactor otorga 3 Aether'],
  [/gewährt 1 Aether/g, 'grants 1 Aether', 'otorga 1 Aether'],
  [/gewährt 2 Aether/g, 'grants 2 Aether', 'otorga 2 Aether'],
  [/Wähle eine gegnerische Einheit, die eingefroren werden soll/g, 'Choose an enemy unit to freeze', 'Elige una unidad enemiga para congelar'],
  [/Wähle eine gegnerische Einheit mit Kosten 3 oder weniger, die verbannt werden soll/g, 'Choose an enemy unit with cost 3 or less to banish', 'Elige una unidad enemiga con coste 3 o menos para desterrar'],
  [/Wähle eine gegnerische Einheit zum Schwächen/g, 'Choose an enemy unit to weaken', 'Elige una unidad enemiga para debilitar'],
  [/Wähle eine gegnerische Einheit/g, 'Choose an enemy unit', 'Elige una unidad enemiga'],
  [/Wähle eine angreifende Einheit/g, 'Choose an attacking unit', 'Elige una unidad atacante'],
  [/Wähle zwei Einheiten, um ihre Kosten zu tauschen/g, 'Choose two units to swap their costs', 'Elige dos unidades para intercambiar sus costes'],
  [/Wähle bis zu 3 Ziele für Kettenblitz/g, 'Choose up to 3 targets for Chain Lightning', 'Elige hasta 3 objetivos para Cadena de Relámpago'],
  [/Wähle ein Ziel für den kopierten Zauber/g, 'Choose a target for the copied spell', 'Elige un objetivo para el hechizo copiado'],
  [/Wähle ein Ziel/g, 'Choose a target', 'Elige un objetivo'],

  // Compound time references — must run before single-word "Zug" → "turn"
  [/in 1 Zug/g, 'in 1 turn', 'en 1 turno'],
  [/diesen Zug/g, 'this turn', 'este turno'],
  [/dieser Runde/g, 'this round', 'esta ronda'],
  [/dem nächsten Zug/g, 'the next turn', 'el siguiente turno'],

  // Verbs and common terms
  [/gegnerischen Spieler/g, 'enemy player', 'jugador enemigo'],
  [/gegnerischen Einheiten/g, 'enemy units', 'unidades enemigas'],
  [/gegnerische Einheit/g, 'enemy unit', 'unidad enemiga'],
  [/gegnerischen Aether/g, 'enemy Aether', 'Aether enemigo'],
  [/gegnerische Falle/g, 'enemy trap', 'trampa enemiga'],
  [/gegnerischen Fallen/g, 'enemy traps', 'trampas enemigas'],
  [/gegnerische/g, 'enemy', 'enemiga'],
  [/Einheiten/g, 'units', 'unidades'],
  [/Einheit/g, 'unit', 'unidad'],
  [/Bonusschaden/g, 'bonus damage', 'daño adicional'],
  [/Karten/g, 'cards', 'cartas'],
  [/Karte/g, 'card', 'carta'],
  [/Aether-Karte/g, 'Aether card', 'carta de Aether'],
  [/Aether-Vorrat/g, 'Aether pool', 'reserva de Aether'],
  [/Aether-Quelle/g, 'Aether Source', 'fuente de Aether'],
  [/Schadenseffekt/g, 'damage effect', 'efecto de daño'],
  [/Schaden/g, 'damage', 'daño'],
  [/Heilung/g, 'healing', 'curación'],
  [/Beschwörung/g, 'summon', 'invocación'],
  [/Fallen/g, 'traps', 'trampas'],
  [/Falle/g, 'trap', 'trampa'],
  [/Fallenkarte/g, 'trap card', 'carta de trampa'],
  [/Zauberkosten/g, 'spell costs', 'costes de hechizo'],
  [/Zauber/g, 'spell', 'hechizo'],
  [/Gegner/g, 'opponent', 'oponente'],
  [/Spieler/g, 'player', 'jugador'],
  [/Fähigkeit/g, 'ability', 'habilidad'],
  [/Angreifer/g, 'attacker', 'atacante'],
  [/Blocker/g, 'blocker', 'bloqueador'],
  [/Angriff/g, 'attack', 'ataque'],
  [/Hauptphase/g, 'main phase', 'fase principal'],
  [/Kampfphase/g, 'combat phase', 'fase de combate'],
  [/Runde/g, 'round', 'ronda'],
  [/Zug/g, 'turn', 'turno'],
  [/Kosten/g, 'cost', 'coste'],
  [/Belohnung/g, 'reward', 'recompensa'],
  [/Sieg/g, 'victory', 'victoria'],
  [/Eile/g, 'haste', 'celeridad'],
  [/Beschwörungskrankheit/g, 'summoning sickness', 'mareo de invocación'],
  [/Relikt/g, 'relic', 'reliquia'],

  // Adjectives / participles
  [/eingefroren/g, 'frozen', 'congelada'],
  [/gefesselt/g, 'entangled', 'enredada'],
  [/erschöpft/g, 'exhausted', 'agotada'],
  [/überladen/g, 'overcharged', 'sobrecargada'],
  [/unverwundbar/g, 'invulnerable', 'invulnerable'],
  [/zerstört/g, 'destroyed', 'destruido'],
  [/ausgelöst/g, 'triggered', 'activado'],
  [/wiederbelebt/g, 'revived', 'resucitado'],
  [/abgewehrt/g, 'parried', 'parado'],
  [/ungültig/g, 'invalid', 'inválido'],
  [/permanent/g, 'permanent', 'permanente'],
  [/aktiv/g, 'active', 'activo'],

  // Verbs (declined forms)
  [/Wähle/g, 'Choose', 'Elige'],
  [/wähle/g, 'choose', 'elige'],
  [/auswählen/g, 'select', 'seleccionar'],
  [/blockiert nun/g, 'now blocks', 'ahora bloquea'],
  [/blockiert/g, 'blocks', 'bloquea'],
  [/blocken/g, 'block', 'bloquear'],
  [/spielt/g, 'plays', 'juega'],
  [/spielen/g, 'play', 'jugar'],
  [/beschwört/g, 'summons', 'invoca'],
  [/heilt um/g, 'heals for', 'cura'],
  [/heilt/g, 'heals', 'cura'],
  [/fügt/g, 'deals', 'inflige'],
  [/erleidet/g, 'takes', 'recibe'],
  [/erhält/g, 'gains', 'gana'],
  [/gewährt/g, 'grants', 'otorga'],
  [/verhindert/g, 'prevents', 'impide'],
  [/reduziert/g, 'reduces', 'reduce'],
  [/aktiviert/g, 'activates', 'activa'],
  [/deklariert/g, 'declares', 'declara'],
  [/gestoppt/g, 'stopped', 'detenido'],
  [/friert/g, 'freezes', 'congela'],
  [/gibt/g, 'gives', 'da'],
  [/benötigt/g, 'needs', 'necesita'],
  [/hast/g, 'you have', 'tienes'],
  [/legt eine/g, 'plays a', 'juega una'],
  [/legt/g, 'plays', 'juega'],
  [/setzt/g, 'resets', 'reinicia'],
  [/stärkt/g, 'strengthens', 'fortalece'],
  [/schützt/g, 'protects', 'protege'],
  [/ist/g, 'is', 'es'],
  [/sind/g, 'are', 'son'],
  [/wird/g, 'is being', 'es'],

  // Connector words
  [/Ungültiges Ziel/g, 'Invalid target', 'Objetivo no válido'],
  [/Kein Platz/g, 'No room', 'No hay espacio'],
  [/Nicht genug/g, 'Not enough', 'No hay suficiente'],
  [/Neuer Angriff/g, 'New attack', 'Nuevo ataque'],
  [/Neuer/g, 'New', 'Nuevo'],
  [/dem nächsten/g, 'the next', 'el siguiente'],
];

export function translateGameText(language: Language, text: string, values?: Record<string, string | number>) {
  if (!text || language === 'de') return format(text, values);
  const dictionary = getDictionary(language);
  const exactKey = exactGameText[text];
  if (exactKey && dictionary.logText[exactKey]) {
    return format(dictionary.logText[exactKey], values);
  }
  for (const pattern of gameTextPatterns) {
    const match = text.match(pattern.match);
    if (match && dictionary.logText[pattern.key]) {
      return format(dictionary.logText[pattern.key], { ...pattern.values(match), ...values });
    }
  }
  const replacementIndex = language === 'en' ? 1 : 2;
  return fallbackGameReplacements.reduce(
    (next, replacement) => next.replace(replacement[0], replacement[replacementIndex]),
    format(text, values)
  );
}

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  localizeCard: <T extends CardData>(card: T) => T;
  localizeDeck: <T extends Deck>(deck: T) => T;
  localizeMission: <T extends Mission>(mission: T) => T;
  localizeCosmetic: <T extends CosmeticItem>(item: T) => T;
  cardType: (type: CardType) => string;
  element: (element: Element) => string;
  rarity: (rarity: Rarity) => string;
  gameText: (text: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const storedLanguage = normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    setLanguageState(storedLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => translate(language, key, values),
    localizeCard: (card) => localizeCard(card, language),
    localizeDeck: (deck) => localizeDeck(deck, language),
    localizeMission: (mission) => localizeMission(mission, language),
    localizeCosmetic: (item) => localizeCosmetic(item, language),
    cardType: (type) => translateCardType(language, type),
    element: (element) => translateElement(language, element),
    rarity: (rarity) => translateRarity(language, rarity),
    gameText: (text, values) => translateGameText(language, text, values),
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}
