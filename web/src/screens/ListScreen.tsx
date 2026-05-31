import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { categoryOf } from '../lib/categories';
import { distanceLabel, initials, timeLeft } from '../lib/format';
import type { NearbyStatus } from '../hooks/useStatuses';

function Card({ status }: { status: NearbyStatus }) {
  const cat = categoryOf(status.category);
  return (
    <div className="card" style={{ position: 'absolute', inset: 0, borderRadius: 28, padding: 22, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', right: -30, bottom: -30, fontSize: 240, opacity: 0.04 }}>{cat.emoji}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(26,167,160,0.15)', display: 'grid', placeItems: 'center', fontSize: 22 }}>{cat.emoji}</div>
        <span className="muted" style={{ fontWeight: 700, letterSpacing: 2 }}>{cat.label.toUpperCase()}</span>
        <span style={{ flex: 1 }} />
        <span className="chip">🕐 {timeLeft(status.expiresAt)}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15 }}>{status.body}</div>
      </div>

      <span className="chip" style={{ alignSelf: 'flex-start' }}>➤ {distanceLabel(status.distanceMeters)}</span>
      <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--green)', color: '#000', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
          {initials(status.nickname)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{status.nickname}</div>
          <div className="faint" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>HOST</div>
        </div>
      </div>
    </div>
  );
}

export function ListScreen() {
  const { statuses, meetups } = useApp();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const deck = useMemo(
    () => statuses.statuses.filter((s) => !s.isMine && !dismissed.has(s.id)),
    [statuses.statuses, dismissed]
  );
  const top = deck[0];
  const peek = deck[1];

  const dismiss = (id: string) => setDismissed((p) => new Set(p).add(id));
  const skip = () => top && dismiss(top.id);
  const connect = () => {
    if (!top) return;
    meetups.requestJoin(top.id);
    dismiss(top.id);
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <span className="chip"><span className="dot" /> {deck.length} active</span>
        {top && <span className="muted">Tap a button</span>}
      </div>

      <div style={{ position: 'relative', flex: 1, margin: '14px 0' }}>
        {!top ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }} className="muted">
            <div>
              <div style={{ fontSize: 40 }}>🗂️</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>No more cards nearby</div>
              <div className="faint" style={{ marginTop: 4 }}>New statuses show up here as people post.</div>
            </div>
          </div>
        ) : (
          <>
            {peek && (
              <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.95) translateY(14px)', opacity: 0.5 }}>
                <Card status={peek} />
              </div>
            )}
            <Card key={top.id} status={top} />
          </>
        )}
      </div>

      {top && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, paddingBottom: 16 }}>
          <button onClick={skip} className="fab" style={{ width: 64, height: 64, background: 'var(--elevated)', color: 'var(--danger)', fontSize: 26 }}>
            ✕
          </button>
          <button onClick={connect} className="fab" style={{ width: 70, height: 70, background: 'linear-gradient(120deg,var(--teal),var(--yellow))', color: '#000', fontSize: 26 }}>
            💬
          </button>
        </div>
      )}
    </div>
  );
}
