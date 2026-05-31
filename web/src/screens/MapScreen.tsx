import { useState } from 'react';
import { MapView } from '../components/MapView';
import { CreateStatusModal } from '../components/CreateStatusModal';
import { useApp } from '../context/AppContext';

export function MapScreen() {
  const { coords, nearby, displayCount, statuses } = useApp();
  const [recenter, setRecenter] = useState(0);
  const [composer, setComposer] = useState(false);

  return (
    <div className="screen">
      <MapView coords={coords} nearby={nearby} statuses={statuses.statuses} recenterSignal={recenter} />

      <div className="online-badge">
        <span className="dot" />
        <strong>{displayCount}</strong>
        <span className="faint">|</span>
        <span className="muted">Online</span>
      </div>

      <div className="fab-col">
        <button className="fab light" title="Recenter" onClick={() => setRecenter((n) => n + 1)}>
          ➤
        </button>
      </div>

      <div className="post-cta">
        <button className="btn btn-grad" onClick={() => setComposer(true)}>
          + Post Status
        </button>
      </div>

      {composer && <CreateStatusModal onClose={() => setComposer(false)} onPost={statuses.post} />}
    </div>
  );
}
