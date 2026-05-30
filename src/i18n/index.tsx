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
};

const gameTextPatterns: Array<{ match: RegExp; key: GameTextKey; values: (match: RegExpMatchArray) => Record<string, string | number> }> = [
  { match: /^Overheat verstärkt den Schaden um (.+)\.$/, key: 'overheatBoost', values: (match) => ({ amount: match[1] }) },
  { match: /^Nicht genug Aether: benötigt (.+), hast (.+)\.$/, key: 'notEnoughAether', values: (match) => ({ needed: match[1], current: match[2] }) },
  { match: /^ verhindert (.+) Schaden\.$/, key: 'preventsDamage', values: (match) => ({ amount: match[1] }) },
  { match: /^ greift .* direkt an für (.+) Schaden!$/, key: 'directAttack', values: (match) => ({ damage: match[1] }) },
  { match: /^(.+) kann Blocker deklarieren\.$/, key: 'canDeclareBlockers', values: (match) => ({ player: match[1] }) },
  { match: /^ wurde für (.+) Aether überladen \(Kosten: (.+)\)\. Neuer Angriff: (.+)\.$/, key: 'overchargedLog', values: (match) => ({ amount: match[1], cost: match[2], attack: match[3] }) },
  { match: /^'s Ultimate zerstört (.+) Einheiten und heilt um .+\.$/, key: 'ultimateDestroysHeals', values: (match) => ({ count: match[1] }) },
];

const fallbackGameReplacements: Array<[RegExp, string, string]> = [
  [/gegnerischen Spieler/g, 'enemy player', 'jugador enemigo'],
  [/gegnerischen Einheiten/g, 'enemy units', 'unidades enemigas'],
  [/gegnerische Einheit/g, 'enemy unit', 'unidad enemiga'],
  [/Einheiten/g, 'units', 'unidades'],
  [/Einheit/g, 'unit', 'unidad'],
  [/Karten/g, 'cards', 'cartas'],
  [/Karte/g, 'card', 'carta'],
  [/Schaden/g, 'damage', 'daño'],
  [/Bonusschaden/g, 'bonus damage', 'daño adicional'],
  [/Gegner/g, 'opponent', 'oponente'],
  [/Zug/g, 'turn', 'turno'],
  [/Wähle/g, 'Choose', 'Elige'],
  [/wähle/g, 'choose', 'elige'],
  [/auswählen/g, 'select', 'seleccionar'],
  [/Ungültiges Ziel/g, 'Invalid target', 'Objetivo no válido'],
  [/Kein Platz/g, 'No room', 'No hay espacio'],
  [/Nicht genug/g, 'Not enough', 'No hay suficiente'],
  [/benötigt/g, 'needs', 'necesita'],
  [/hast/g, 'you have', 'tienes'],
  [/fügt/g, 'deals', 'inflige'],
  [/heilt um/g, 'heals for', 'cura'],
  [/erhöht deinen Aether-Vorrat/g, 'increases your Aether pool', 'aumenta tu reserva de Aether'],
  [/ist eingefroren und überspringt diesen Zug/g, 'is frozen and skips this turn', 'está congelada y salta este turno'],
  [/erhält/g, 'gains', 'gana'],
  [/gewährt/g, 'grants', 'otorga'],
  [/reduziert die Kosten des nächsten Zaubers/g, 'reduces the cost of the next spell', 'reduce el coste del próximo hechizo'],
  [/zerstört/g, 'destroys', 'destruye'],
  [/ausgelöst/g, 'triggered', 'activado'],
  [/Fähigkeit/g, 'ability', 'habilidad'],
  [/Angreifer/g, 'attacker', 'atacante'],
  [/Blocker/g, 'blocker', 'bloqueador'],
  [/blockiert nun/g, 'now blocks', 'ahora bloquea'],
  [/Angriff/g, 'attack', 'ataque'],
  [/erschöpft/g, 'exhausted', 'agotada'],
  [/überladen/g, 'overcharged', 'sobrecargada'],
  [/Neuer/g, 'New', 'Nuevo'],
  [/Kosten/g, 'costs', 'costes'],
  [/Zauber/g, 'spell', 'hechizo'],
  [/Falle/g, 'trap', 'trampa'],
  [/Sieg/g, 'victory', 'victoria'],
  [/Belohnung/g, 'reward', 'recompensa'],
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
