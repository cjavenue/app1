import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { initials, memberSince } from '../lib/format';

// --- PWA install helper ---
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = window.matchMedia('(display-mode: standalone)').matches;
  return { canPrompt: !!evt, isIos, installed, prompt: () => evt?.prompt() };
}

function RenameModal({ onClose }: { onClose: () => void }) {
  const { profile } = useApp();
  const [value, setValue] = useState(profile.profile?.nickname ?? '');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = value.trim();
    if (!profile.profile || name === profile.profile.nickname || name.length === 0) {
      setStatus('idle');
      return;
    }
    if (!/^[A-Za-z0-9 _]{4,20}$/.test(name)) {
      setStatus('bad');
      return;
    }
    setStatus('checking');
    const t = setTimeout(async () => setStatus((await profile.checkNickname(name)) ? 'ok' : 'bad'), 400);
    return () => clearTimeout(t);
  }, [value, profile]);

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await profile.rename(value.trim());
    setBusy(false);
    if (res.ok) onClose();
    else setError(res.reason === 'taken' ? 'That name is taken.' : res.reason === 'already_changed' ? 'You can only change your name once.' : 'Invalid name (4–20 letters/numbers).');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Change your name</h2>
        <p className="muted" style={{ margin: '0 0 16px' }}>You can only do this once.</p>
        <input className="field" value={value} maxLength={20} onChange={(e) => setValue(e.target.value)} />
        <div style={{ minHeight: 22, marginTop: 8, fontSize: 13, fontWeight: 600 }}>
          {status === 'checking' && <span className="muted">Checking…</span>}
          {status === 'ok' && <span style={{ color: 'var(--green)' }}>✓ Available</span>}
          {status === 'bad' && <span style={{ color: 'var(--danger)' }}>Unavailable or invalid</span>}
        </div>
        {error && <div style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</div>}
        <button className="btn btn-light" style={{ marginTop: 12 }} disabled={status !== 'ok' || busy} onClick={save}>
          {busy ? 'Saving…' : 'Save name'}
        </button>
      </div>
    </div>
  );
}

function VerifyModal({ onClose }: { onClose: () => void }) {
  const { profile } = useApp();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const r = await profile.startEmailVerification(email.trim());
    setBusy(false);
    if (r.ok) setStep('code');
    else setError(r.message ?? 'Could not send the code.');
  };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    const r = await profile.confirmEmail(email.trim(), code.trim());
    setBusy(false);
    if (r.ok) onClose();
    else setError(r.message ?? 'Invalid code.');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {step === 'email' ? (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Verify your email</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>Unverified profiles are removed after 24 hours.</p>
            <input className="field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</div>}
            <button className="btn btn-light" style={{ marginTop: 14 }} disabled={busy || !/.+@.+\..+/.test(email)} onClick={send}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Enter the code</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>Sent a 6-digit code to {email}.</p>
            <input className="field" style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22 }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            {error && <div style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</div>}
            <button className="btn btn-light" style={{ marginTop: 14 }} disabled={busy || code.trim().length < 6} onClick={confirm}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const { profile: p } = useApp();
  const profile = p.profile;
  const install = useInstall();
  const [rename, setRename] = useState(false);
  const [verify, setVerify] = useState(false);

  if (!profile) {
    return (
      <div className="screen">
        <div className="header"><h1>Profile</h1></div>
        <div className="muted" style={{ textAlign: 'center', marginTop: 60 }}>
          {p.loading ? 'Loading your profile…' : 'Share your location to create a profile.'}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header"><h1>Profile</h1></div>
      <div className="scroll" style={{ padding: '0 16px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ width: 110, height: 110, borderRadius: 55, margin: '8px auto 16px', background: 'linear-gradient(135deg,var(--turquoise),var(--green))', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 38, fontWeight: 800 }}>
            {initials(profile.nickname)}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{profile.nickname}</div>
        </div>

        {profile.emailVerified ? (
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, borderColor: 'rgba(52,211,153,0.35)' }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700 }}>Email verified</div>
              <div className="muted" style={{ fontSize: 13 }}>{profile.email}</div>
            </div>
          </div>
        ) : (
          <button className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, width: '100%', textAlign: 'left', borderColor: 'rgba(251,191,36,0.35)' }} onClick={() => setVerify(true)}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Verify your email</div>
              <div className="muted" style={{ fontSize: 13 }}>Unverified profiles are removed after 24 hours.</div>
            </div>
            <span className="muted">›</span>
          </button>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>⚡</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{profile.meetups}</div>
            <div className="muted" style={{ fontSize: 13 }}>Meetups</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>👤</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: profile.gender ? 'var(--text)' : 'var(--faint)' }}>{profile.gender ?? 'Not set'}</div>
            <div className="muted" style={{ fontSize: 13 }}>Gender</div>
          </div>
        </div>

        <div className="card">
          <div className="section-label">NICKNAME</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 16 }}>{profile.nickname}</span>
            {!profile.nicknameChanged && (
              <button onClick={() => setRename(true)} style={{ color: 'var(--turquoise-light)', fontWeight: 600 }}>✎ Change</button>
            )}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          <div className="section-label">INTERESTS</div>
          <div className="muted" style={{ marginTop: 6 }}>{profile.interests.length ? profile.interests.join(', ') : 'None set'}</div>
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">📅 Member since</span>
            <span className="muted">{memberSince(profile.createdAt)}</span>
          </div>
        </div>

        {profile.emailVerified && (
          <div style={{ marginTop: 20 }}>
            <div className="muted" style={{ textAlign: 'center', fontSize: 13, marginBottom: 10 }}>Sign in faster next time</div>
            <button className="btn btn-ghost" onClick={p.signInWithGoogle}>Continue with Google</button>
          </div>
        )}

        {!install.installed && (
          <button
            className="card"
            style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', marginTop: 20 }}
            onClick={() => (install.canPrompt ? install.prompt() : undefined)}
          >
            <span style={{ fontSize: 20 }}>⬇️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Add to Home Screen</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {install.isIos ? 'Tap Share → “Add to Home Screen”' : install.canPrompt ? 'Install Nearby as an app' : 'Use your browser menu to install'}
              </div>
            </div>
          </button>
        )}
      </div>

      {rename && <RenameModal onClose={() => setRename(false)} />}
      {verify && <VerifyModal onClose={() => setVerify(false)} />}
    </div>
  );
}
