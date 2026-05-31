import { useApp } from '../context/AppContext';

export type TabKey = 'map' | 'list' | 'statuses' | 'chats' | 'profile';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'map', label: 'Map', icon: '🗺️' },
  { key: 'list', label: 'List', icon: '☰' },
  { key: 'statuses', label: 'Statuses', icon: '📡' },
  { key: 'chats', label: 'Chats', icon: '💬' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const { meetups } = useApp();
  const badge = meetups.incoming.length;

  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button key={t.key} className={`nav-item ${active === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
          <span>{t.label}</span>
          {t.key === 'statuses' && badge > 0 && <span className="nav-badge">{badge}</span>}
        </button>
      ))}
    </nav>
  );
}
