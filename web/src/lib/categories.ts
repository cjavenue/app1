import type { Icon } from '@phosphor-icons/react';
import {
  ForkKnife,
  Trophy,
  PersonSimpleWalk,
  GameController,
  BookOpen,
  Airplane,
  Tag,
} from '@phosphor-icons/react';

export type CategoryKey = 'food' | 'sports' | 'walk' | 'games' | 'study' | 'travel' | 'other';

export interface Category {
  key: CategoryKey;
  label: string;
  Glyph: Icon;
}

// Canonical category list shared by the composer, list deck and status pins.
export const CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', Glyph: ForkKnife },
  { key: 'sports', label: 'Sports', Glyph: Trophy },
  { key: 'walk', label: 'Walk', Glyph: PersonSimpleWalk },
  { key: 'games', label: 'Games', Glyph: GameController },
  { key: 'study', label: 'Study', Glyph: BookOpen },
  { key: 'travel', label: 'Travel', Glyph: Airplane },
  { key: 'other', label: 'Other', Glyph: Tag },
];

export const categoryOf = (key: string): Category =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

export const STATUS_MAX_LENGTH = 100;
