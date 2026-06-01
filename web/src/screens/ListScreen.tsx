import { useEffect, useState } from 'react';
import { ChatCircle, Circle, MapTrifold } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { PostCard } from '../components/PostCard';
import { categoryOf } from '../lib/categories';
import { liveness, LIVENESS_COLOR, timeLeft } from '../lib/format';
import type { MapPost } from '../hooks/usePosts';

export function ListScreen() {
  const { coords, posts } = useApp();
  const [open, setOpen] = useState<MapPost | null>(null);

  useEffect(() => {
    if (coords) posts.loadAround(coords);
    const t = setInterval(() => coords && posts.loadAround(coords), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  const list = posts.posts;

  return (
    <div className="screen">
      <div className="header"><h1>Nearby</h1></div>
      <div className="scroll" style={{ padding: '0 16px 24px' }}>
        {list.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 90 }} className="muted">
            <MapTrifold size={40} weight="regular" />
            <div className="t-title" style={{ color: 'var(--text)', marginTop: 10 }}>No posts nearby</div>
            <div className="faint t-meta" style={{ marginTop: 4 }}>Tap “Post” on the map to drop the first one.</div>
          </div>
        )}

        {list.map((p) => {
          const cat = categoryOf(p.category);
          const color = LIVENESS_COLOR[liveness(p.createdAt)];
          return (
            <button
              key={p.id}
              className="card"
              onClick={() => setOpen(p)}
              style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', marginBottom: 12 }}
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0, background: 'var(--elevated)' }} />
              ) : (
                <div className="icon-tile" style={{ width: 56, height: 56, color }}>
                  <cat.Glyph size={26} weight="fill" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="t-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</span>
                </div>
                <div className="muted" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.body || (p.imageUrl ? 'Photo' : '')}
                </div>
                <div className="faint" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Circle size={9} weight="fill" color={color} /> {timeLeft(p.expiresAt)} left
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                    <ChatCircle size={13} /> {p.commentCount}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {open && <PostCard post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
