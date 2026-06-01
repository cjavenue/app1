import { useRef, useState } from 'react';
import { X, Camera, Trash } from '@phosphor-icons/react';
import { CATEGORIES, type CategoryKey } from '../lib/categories';
import { useApp } from '../context/AppContext';
import type { Coords } from '../hooks/useLocation';

const BODY_MAX = 140;

export function CreatePostModal({ coords, onClose }: { coords: Coords; onClose: () => void }) {
  const { posts } = useApp();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryKey>('food');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await posts.create(body, category, coords, file);
    setBusy(false);
    if (res.ok) {
      if (preview) URL.revokeObjectURL(preview);
      onClose();
    } else setError(res.message);
  };

  return (
    <div className="full-modal">
      <div className="header" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <h1>New Post</h1>
          <div className="muted t-meta" style={{ marginTop: 4 }}>Pinned here for 1 hour</div>
        </div>
        <button onClick={onClose} className="fab" style={{ width: 36, height: 36, background: 'var(--elevated)' }}>
          <X size={18} />
        </button>
      </div>

      <div className="scroll" style={{ padding: 20 }}>
        {/* Optional photo */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <img src={preview} alt="" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 16 }} />
            <button
              onClick={() => pick(null)}
              className="fab"
              style={{ position: 'absolute', top: 10, right: 10, width: 38, height: 38, background: 'rgba(0,0,0,0.55)', color: '#fff' }}
            >
              <Trash size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', aspectRatio: '1 / 1', borderRadius: 16, marginBottom: 18,
              border: '1.5px dashed var(--border)', background: 'var(--elevated)', color: 'var(--muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <Camera size={40} weight="regular" />
            <span className="t-meta">Add a photo (optional)</span>
            <span className="faint" style={{ fontSize: 11 }}>Square, optimized to 1000×1000</span>
          </button>
        )}

        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
          placeholder="What's happening here?"
          rows={3}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 20, fontWeight: 600, resize: 'none' }}
        />
        <div className="faint" style={{ textAlign: 'right', fontSize: 13 }}>{body.length}/{BODY_MAX}</div>

        <div className="section-label" style={{ marginTop: 20, marginBottom: 12 }}>CATEGORY</div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c.key} className={`chip ${c.key === category ? 'active' : ''}`} onClick={() => setCategory(c.key)}>
              <c.Glyph size={18} /> {c.label}
            </button>
          ))}
        </div>
        <div className="muted t-meta" style={{ marginTop: 14 }}>Approximate location is used. Anyone can comment.</div>

        {error && <div style={{ color: 'var(--danger)', marginTop: 16, fontWeight: 600 }}>{error}</div>}
      </div>

      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom) + 16px)', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-grad" disabled={busy || (!body.trim() && !file)} onClick={submit}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
