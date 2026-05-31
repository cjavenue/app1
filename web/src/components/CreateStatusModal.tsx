import { useState } from 'react';
import { CATEGORIES, STATUS_MAX_LENGTH, type CategoryKey } from '../lib/categories';
import type { PostResult } from '../hooks/useStatuses';

interface Props {
  onClose: () => void;
  onPost: (body: string, category: CategoryKey) => Promise<PostResult>;
}

export function CreateStatusModal({ onClose, onPost }: Props) {
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryKey>('food');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPosting(true);
    setError(null);
    const res = await onPost(body.trim(), category);
    setPosting(false);
    if (res.ok) onClose();
    else setError(res.message);
  };

  return (
    <div className="full-modal">
      <div className="header" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24 }}>Create Status</h1>
          <div className="muted" style={{ marginTop: 4 }}>Share what you're up to nearby</div>
        </div>
        <button
          onClick={onClose}
          className="fab"
          style={{ width: 36, height: 36, background: 'var(--elevated)', border: 'none', fontSize: 18 }}
        >
          ✕
        </button>
      </div>

      <div className="scroll" style={{ padding: 20 }}>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, STATUS_MAX_LENGTH))}
          placeholder="What's happening?"
          rows={3}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 22,
            fontWeight: 600,
            resize: 'none',
          }}
        />
        <div className="faint" style={{ textAlign: 'right', fontSize: 14 }}>
          {body.length}/{STATUS_MAX_LENGTH}
        </div>

        <div className="section-label" style={{ marginTop: 24, marginBottom: 14 }}>CATEGORY</div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip ${c.key === category ? 'active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
        <div className="muted" style={{ marginTop: 16, fontSize: 14 }}>Anyone nearby can ask to join.</div>

        {error && <div style={{ color: 'var(--danger)', marginTop: 16, fontWeight: 600 }}>{error}</div>}
      </div>

      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom) + 16px)', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-grad" disabled={!body.trim() || posting} onClick={submit}>
          {posting ? 'Posting…' : 'Post Status'}
        </button>
      </div>
    </div>
  );
}
