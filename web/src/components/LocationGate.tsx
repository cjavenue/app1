import { MapPin } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

/** First-run gate: blurs the app and asks for location permission. */
export function LocationGate() {
  const { permission, requestAndStart, useManual } = useApp();
  if (permission !== 'undetermined') return null;

  return (
    <div className="overlay">
      <div className="sheet" style={{ textAlign: 'center' }}>
        <div className="grabber" />
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: 43,
            background: 'var(--elevated)',
            color: 'var(--teal)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 22px',
          }}
        >
          <MapPin size={38} weight="fill" />
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 24 }}>Enable your location</h2>
        <p className="muted" style={{ margin: '0 0 28px', fontSize: 16, lineHeight: 1.4 }}>
          See what's happening around you and connect with people nearby in real time
        </p>
        <button className="btn" style={{ background: '#fff', color: '#000' }} onClick={requestAndStart}>
          Enable Location
        </button>
        <button
          onClick={useManual}
          className="muted"
          style={{ marginTop: 18, fontSize: 15, fontWeight: 600, width: '100%' }}
        >
          Continue without location
        </button>
      </div>
    </div>
  );
}
