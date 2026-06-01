import { useState } from 'react';
import { ChatsCircle } from '@phosphor-icons/react';
import { AppProvider } from './context/AppContext';
import { BottomNav, type TabKey } from './components/BottomNav';
import { LocationGate } from './components/LocationGate';
import { MapScreen } from './screens/MapScreen';
import { ListScreen } from './screens/ListScreen';
import { StatusesScreen } from './screens/StatusesScreen';
import { ProfileScreen } from './screens/ProfileScreen';

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="screen">
      <div className="header"><h1>{title}</h1></div>
      <div className="muted" style={{ textAlign: 'center', marginTop: 80 }}>
        <ChatsCircle size={44} weight="regular" />
        <div className="t-title" style={{ color: 'var(--text)', marginTop: 10 }}>Coming soon</div>
        <div className="faint t-meta" style={{ marginTop: 4 }}>We're building this piece by piece.</div>
      </div>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>('map');
  return (
    <div className="app">
      {tab === 'map' && <MapScreen />}
      {tab === 'list' && <ListScreen />}
      {tab === 'statuses' && <StatusesScreen />}
      {tab === 'chats' && <ComingSoon title="Chats" />}
      {tab === 'profile' && <ProfileScreen />}
      <BottomNav active={tab} onChange={setTab} />
      <LocationGate />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
