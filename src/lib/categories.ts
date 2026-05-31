import { Ionicons } from '@expo/vector-icons';

export type CategoryKey = 'food' | 'sports' | 'walk' | 'games' | 'study' | 'travel' | 'other';

export interface Category {
  key: CategoryKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** The fixed status categories shown in the composer. */
export const CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', icon: 'restaurant-outline' },
  { key: 'sports', label: 'Sports', icon: 'trophy-outline' },
  { key: 'walk', label: 'Walk', icon: 'walk-outline' },
  { key: 'games', label: 'Games', icon: 'game-controller-outline' },
  { key: 'study', label: 'Study', icon: 'book-outline' },
  { key: 'travel', label: 'Travel', icon: 'compass-outline' },
  { key: 'other', label: 'Other', icon: 'location-outline' },
];

export const categoryOf = (key: string): Category =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

export const STATUS_MAX_LENGTH = 100;
