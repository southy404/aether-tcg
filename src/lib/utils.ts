import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CardData } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns true if a unit card actually uses Focus (either an active "Aktiv (X Fokus): …"
 * ability or a passive "gain N Focus" interaction). The base card.text is in German, the
 * localized variant in English/Spanish — we accept either spelling.
 *
 * Cards with a non-zero `fokus` stat but no Focus mention in their text are treated as
 * "no Focus capability" — the stat is meaningless cosmetic clutter for them, so the UI
 * should hide it.
 */
export function hasFocusCapability(card: Pick<CardData, 'type' | 'text'> & { fokus?: number }): boolean {
  if (card.type !== 'Unit') return false;
  const text = card.text ?? '';
  // German "Fokus" and English/Spanish "Focus" both trigger.
  return /Fokus|Focus/i.test(text);
}
