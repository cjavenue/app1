import type { Icon } from '@phosphor-icons/react';
import { MapTrifold, ListBullets, Broadcast, Chats, User } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export type TabKey = 'map' | 'list' | 'statuses' | 'chats' | 'profile';

const TABS: { key: TabKey; label: string; icon: Icon }[] = [
  { key: 'map', label: 'Map', icon: MapTrifold },
  { key: 'list', label: 'List', icon: ListBullets },
  { key: 'statuses', label: 'Statuses', icon: Broadcast },
  { key: 'chats', label: 'Chats', icon: Chats },
  { key: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const { meetups } = useApp();
  const badge = meetups.incoming.length;

  return (
    <nav className="bottom-nav">
      {TABS.map((t) => {
        const isActive = active === t.key;
        const Glyph = t.icon;
        return (
          <button key={t.key} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => onChange(t.key)}>
            <Glyph size={24} weight={isActive ? 'fill' : 'regular'} />
            <span>{t.label}</span>
            {t.key === 'statuses' && badge > 0 && <span className="nav-badge">{badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}
