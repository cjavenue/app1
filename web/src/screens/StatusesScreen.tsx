import { useEffect, useMemo, useState } from 'react';
import { Broadcast, Circle, ChatCircle, Trash } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { PostCard } from '../components/PostCard';
import { categoryOf } from '../lib/categories';
import { liveness, LIVENESS_COLOR, timeLeft, timeAgo } from '../lib/format';
import type { MapPost, PostComment } from '../hooks/usePosts';

export function StatusesScreen() {
  const { coords, posts } = useApp();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [open, setOpen] = useState<MapPost | null>(null);

  const mine = useMemo(() => posts.posts.find((p) => p.isMine) ?? null, [posts.posts]);

  useEffect(() => {
    if (coords) posts.loadAround(coords);
    const t = setInterval(() => coords && posts.loadAround(coords), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  useEffect(() => {
    if (mine) posts.listComments(mine.id).then(setComments);
    else setComments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.id, mine?.commentCount]);

  const remove = async () => {
    await posts.deleteMine();
  };

  return (
    <div className="screen">
      <div className="header"><h1>Activity</h1></div>
      <div className="scroll" style={{ padding: '0 16px 24px' }}>
        {!mine ? (
          <div style={{ textAlign: 'center', paddingTop: 90 }} className="muted">
            <Broadcast size={40} weight="regular" />
            <div className="t-title" style={{ color: 'var(--text)', marginTop: 10 }}>No active post</div>
            <div className="faint t-meta" style={{ marginTop: 4 }}>Post on the map — it stays live for 1 hour.</div>
          </div>
        ) : (
          <>
            <div className="section-label" style={{ margin: '6px 0 10px' }}>YOUR POST</div>
            <PostRow post={mine} onOpen={() => setOpen(mine)} onDelete={remove} />

            <div className="section-label" style={{ margin: '22px 0 10px' }}>
              COMMENTS{comments.length ? ` · ${comments.length}` : ''}
            </div>
            {comments.length === 0 ? (
              <div className="faint t-meta">No comments yet.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{c.nickname}</span>
                    <span className="faint" style={{ fontSize: 11 }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="t-body" style={{ fontSize: 15, marginTop: 2 }}>{c.body}</div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {open && <PostCard post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PostRow({ post, onOpen, onDelete }: { post: MapPost; onOpen: () => void; onDelete: () => void }) {
  const cat = categoryOf(post.category);
  const color = LIVENESS_COLOR[liveness(post.createdAt)];
  return (
    <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button onClick={onOpen} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, textAlign: 'left' }}>
        {post.imageUrl ? (
          <img src={post.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0, background: 'var(--elevated)' }} />
        ) : (
          <div className="icon-tile" style={{ width: 56, height: 56, color }}>
            <cat.Glyph size={26} weight="fill" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post.body || (post.imageUrl ? 'Photo' : '')}
          </div>
          <div className="faint" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Circle size={9} weight="fill" color={color} /> {timeLeft(post.expiresAt)} left
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
              <ChatCircle size={13} /> {post.commentCount}
            </span>
          </div>
        </div>
      </button>
      <button onClick={onDelete} className="fab" style={{ width: 40, height: 40, background: 'var(--elevated)', color: 'var(--danger)', flexShrink: 0 }}>
        <Trash size={18} />
      </button>
    </div>
  );
}
