export type CategoryKey = 'food' | 'sports' | 'walk' | 'games' | 'study' | 'travel' | 'other';

export interface Category {
  key: CategoryKey;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', emoji: '🍴' },
  { key: 'sports', label: 'Sports', emoji: '🏆' },
  { key: 'walk', label: 'Walk', emoji: '🚶' },
  { key: 'games', label: 'Games', emoji: '🎮' },
  { key: 'study', label: 'Study', emoji: '📖' },
  { key: 'travel', label: 'Travel', emoji: '🧭' },
  { key: 'other', label: 'Other', emoji: '📍' },
];

export const categoryOf = (key: string): Category =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

export const STATUS_MAX_LENGTH = 100;
