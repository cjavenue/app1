import { useEffect, useRef, useState } from 'react';
import { X, PaperPlaneRight, Trash, Circle } from '@phosphor-icons/react';
import { categoryOf } from '../lib/categories';
import { liveness, LIVENESS_COLOR, timeLeft, timeAgo } from '../lib/format';
import { useApp } from '../context/AppContext';
import type { MapPost, PostComment } from '../hooks/usePosts';

const COMMENT_MAX = 200;

export function PostCard({ post, onClose }: { post: MapPost; onClose: () => void }) {
  const { posts } = useApp();
  const cat = categoryOf(post.category);
  const live = liveness(post.createdAt);
  const color = LIVENESS_COLOR[live];

  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => setComments(await posts.listComments(post.id));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setErr(null);
    const res = await posts.addComment(post.id, body);
    setBusy(false);
    if (!res.ok) { setErr(res.message); return; }
    setText('');
    await load();
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  };

  const remove = async (id: string) => {
    await posts.deleteComment(id);
    await load();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet post-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />

        {/* Header: category + author + liveness + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className="icon-tile" style={{ width: 40, height: 40, color }}>
            <cat.Glyph size={22} weight="fill" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.nickname}
            </div>
            <div className="faint" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Circle size={9} weight="fill" color={color} /> {timeLeft(post.expiresAt)} left · {cat.label}
            </div>
          </div>
          <button className="fab" style={{ width: 34, height: 34, background: 'var(--elevated)' }} onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 16, marginBottom: 14, background: 'var(--elevated)' }}
          />
        )}

        {post.body && <div className="t-body" style={{ marginBottom: 16 }}>{post.body}</div>}

        <div className="section-label" style={{ marginBottom: 10 }}>
          COMMENTS{comments.length ? ` · ${comments.length}` : ''}
        </div>

        <div ref={scrollRef} style={{ maxHeight: 230, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
          {comments.length === 0 && (
            <div className="faint t-meta" style={{ padding: '6px 0 14px' }}>No comments yet. Say something.</div>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nickname}</span>
                <span className="faint" style={{ fontSize: 11, marginLeft: 6 }}>{timeAgo(c.createdAt)}</span>
                <div className="t-body" style={{ fontSize: 15, marginTop: 1 }}>{c.body}</div>
              </div>
              {c.canDelete && (
                <button onClick={() => remove(c.id)} className="faint" style={{ padding: 4 }}>
                  <Trash size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 6 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <input
            className="field"
            placeholder="Add a comment…"
            value={text}
            maxLength={COMMENT_MAX}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          />
          <button
            className="fab"
            style={{ width: 48, height: 48, flexShrink: 0, background: 'linear-gradient(120deg,var(--teal),var(--yellow))', color: '#0F1316' }}
            disabled={busy || !text.trim()}
            onClick={send}
          >
            <PaperPlaneRight size={20} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
