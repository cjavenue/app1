import { useEffect, useState } from 'react';
import { NavigationArrow, Plus } from '@phosphor-icons/react';
import { MapView } from '../components/MapView';
import { CreatePostModal } from '../components/CreatePostModal';
import { PostCard } from '../components/PostCard';
import { useApp } from '../context/AppContext';
import type { MapPost } from '../hooks/usePosts';

export function MapScreen() {
  const { coords, nearby, displayCount, posts, requestAndStart } = useApp();
  const [recenter, setRecenter] = useState(0);
  const [composer, setComposer] = useState(false);
  const [open, setOpen] = useState<MapPost | null>(null);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Refresh visible posts periodically so liveness + expiry stay current.
  useEffect(() => {
    const t = setInterval(() => posts.refresh(), 30_000);
    return () => clearInterval(t);
  }, [posts]);

  // Post needs a location. If we don't have one yet (skipped/denied/timed out),
  // tapping Post re-requests it instead of doing nothing.
  const onPost = async () => {
    if (coords) {
      setComposer(true);
      return;
    }
    setLocating(true);
    setHint(null);
    const ok = await requestAndStart();
    setLocating(false);
    if (ok) setComposer(true);
    else setHint('Location is needed to post. Enable location access for this site in your browser settings, then tap Post again.');
  };

  return (
    <div className="screen">
      <MapView
        coords={coords}
        nearby={nearby}
        posts={posts.posts}
        recenterSignal={recenter}
        onBoundsChange={posts.loadBounds}
        onOpenPost={setOpen}
      />

      <div className="online-badge">
        <span className="dot" />
        <strong>{displayCount}</strong>
        <span className="faint">|</span>
        <span className="muted">Online</span>
      </div>

      <div className="fab-col">
        <button className="fab light" title="Recenter" onClick={() => setRecenter((n) => n + 1)}>
          <NavigationArrow size={20} weight="fill" />
        </button>
      </div>

      <div className="post-cta">
        {hint && (
          <div
            style={{
              position: 'absolute', bottom: 72, left: 16, right: 16,
              background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.5)',
              color: '#FCA5A5', borderRadius: 12, padding: '10px 12px', fontSize: 13, lineHeight: 1.4,
            }}
            onClick={() => setHint(null)}
          >
            {hint}
          </div>
        )}
        <button className="btn btn-grad" onClick={onPost} disabled={locating}>
          <Plus size={20} weight="bold" /> {locating ? 'Locating…' : 'Post'}
        </button>
      </div>

      {composer && coords && <CreatePostModal coords={coords} onClose={() => setComposer(false)} />}
      {open && <PostCard post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
