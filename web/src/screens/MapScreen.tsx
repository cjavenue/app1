import { useEffect, useState } from 'react';
import { NavigationArrow, Plus } from '@phosphor-icons/react';
import { MapView } from '../components/MapView';
import { CreatePostModal } from '../components/CreatePostModal';
import { PostCard } from '../components/PostCard';
import { useApp } from '../context/AppContext';
import type { MapPost } from '../hooks/usePosts';

export function MapScreen() {
  const { coords, nearby, displayCount, posts } = useApp();
  const [recenter, setRecenter] = useState(0);
  const [composer, setComposer] = useState(false);
  const [open, setOpen] = useState<MapPost | null>(null);

  // Refresh visible posts periodically so liveness + expiry stay current.
  useEffect(() => {
    const t = setInterval(() => posts.refresh(), 30_000);
    return () => clearInterval(t);
  }, [posts]);

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
        <button className="btn btn-grad" onClick={() => setComposer(true)} disabled={!coords}>
          <Plus size={20} weight="bold" /> Post
        </button>
      </div>

      {composer && coords && <CreatePostModal coords={coords} onClose={() => setComposer(false)} />}
      {open && <PostCard post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
