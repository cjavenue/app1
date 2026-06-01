import { Check, Broadcast } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { categoryOf } from '../lib/categories';
import { distanceLabel, timeAgo } from '../lib/format';
import type { JoinState } from '../hooks/useMeetups';

function JoinControl({ state, onRequest }: { state: JoinState | undefined; onRequest: () => void }) {
  if (state === 'accepted')
    return (
      <span className="chip" style={{ background: 'rgba(26,167,160,0.15)', color: 'var(--teal)', gap: 4 }}>
        <Check size={15} weight="bold" /> Joined
      </span>
    );
  if (state === 'pending') return <span className="chip">Requested</span>;
  if (state === 'declined') return <span className="chip faint">Declined</span>;
  return (
    <button className="chip active" onClick={onRequest}>
      Ask to join
    </button>
  );
}

export function StatusesScreen() {
  const { statuses, meetups, profile } = useApp();

  const respond = async (id: string, accept: boolean) => {
    const res = await meetups.respond(id, accept);
    if (res.ok && accept) await profile.reload();
  };

  return (
    <div className="screen">
      <div className="header">
        <h1>Statuses</h1>
      </div>
      <div className="scroll" style={{ padding: '0 16px 24px' }}>
        {meetups.incoming.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div className="section-label" style={{ margin: '4px 0 10px' }}>REQUESTS TO JOIN YOU</div>
            {meetups.incoming.map((req) => (
              <div key={req.id} className="card" style={{ marginBottom: 12, borderColor: 'rgba(26,167,160,0.3)' }}>
                <div className="t-body">
                  <strong>{req.requesterNickname}</strong> wants to join your status
                </div>
                <div className="muted t-meta" style={{ fontStyle: 'italic', marginTop: 6 }}>“{req.statusBody}”</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => respond(req.id, false)}>
                    Decline
                  </button>
                  <button className="btn btn-light" style={{ height: 44 }} onClick={() => respond(req.id, true)}>
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {statuses.statuses.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 90 }} className="muted">
            <Broadcast size={40} weight="regular" />
            <div className="t-title" style={{ color: 'var(--text)', marginTop: 10 }}>Nothing nearby yet</div>
            <div className="faint t-meta" style={{ marginTop: 4 }}>Be the first — tap “Post Status” on the map.</div>
          </div>
        )}

        {statuses.statuses.map((s) => {
          const cat = categoryOf(s.category);
          return (
            <div key={s.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label-jakarta" style={{ color: 'var(--teal-light)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <cat.Glyph size={16} /> {cat.label}
                </span>
                <span className="faint" style={{ fontSize: 12 }}>{timeAgo(s.createdAt)}</span>
              </div>
              <div className="t-body" style={{ marginTop: 10 }}>{s.body}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <span className="muted" style={{ fontSize: 14 }}>
                  {s.isMine ? 'You' : s.nickname} · {distanceLabel(s.distanceMeters)}
                </span>
                {!s.isMine && (
                  <JoinControl state={meetups.outgoingState(s.id)} onRequest={() => meetups.requestJoin(s.id)} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
