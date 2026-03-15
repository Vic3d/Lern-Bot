'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser, signInWithMagicLink, signOut, onAuthStateChange, UserInfo } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AuthButton() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Supabase not configured — don't render
  if (!isSupabaseConfigured()) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u.isAnonymous) setUser(u);
    });
    const unsub = onAuthStateChange(u => setUser(u));
    return unsub;
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showModal]);

  const handleSendLink = async () => {
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus('error');
      setErrorMsg(error);
    } else {
      setStatus('sent');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendLink();
    if (e.key === 'Escape') setShowModal(false);
  };

  return (
    <>
      {/* Button */}
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--gold)', color: 'var(--navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            {user.displayName || user.email}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            }}
          >
            Abmelden
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '6px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(255,255,255,0.15)', color: 'white',
            border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
          }}
        >
          Anmelden
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            background: 'white', borderRadius: '16px', padding: '32px',
            width: '100%', maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Bei LearnFlow anmelden
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Wir schicken dir einen Magic Link — kein Passwort nötig.
              Du kannst auch ohne Anmeldung weitermachen.
            </p>

            {status === 'sent' ? (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '10px', padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>📬</p>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>E-Mail verschickt!</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Klick auf den Link in deiner E-Mail um dich anzumelden.
                </p>
                <button
                  onClick={() => { setShowModal(false); setStatus('idle'); setEmail(''); }}
                  style={{
                    marginTop: '16px', padding: '8px 20px', borderRadius: '8px',
                    background: 'var(--navy)', color: 'white', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  }}
                >
                  Schließen
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="email"
                  placeholder="deine@email.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={status === 'loading'}
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: '15px',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    outline: 'none', marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />

                {status === 'error' && (
                  <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>
                    ⚠️ {errorMsg}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSendLink}
                    disabled={status === 'loading' || !email.trim()}
                    style={{
                      flex: 1, padding: '11px', borderRadius: '8px',
                      background: 'var(--navy)', color: 'white', border: 'none',
                      cursor: status === 'loading' || !email.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: 600, fontSize: '14px',
                      opacity: !email.trim() ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    {status === 'loading' && <span className="spinner" />}
                    {status === 'loading' ? 'Wird gesendet...' : 'Magic Link senden'}
                  </button>
                  <button
                    onClick={() => { setShowModal(false); setStatus('idle'); setEmail(''); }}
                    style={{
                      padding: '11px 16px', borderRadius: '8px',
                      background: 'var(--off-white)', color: 'var(--text)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Abbrechen
                  </button>
                </div>

                <p style={{
                  fontSize: '12px', color: 'var(--text-muted)',
                  textAlign: 'center', marginTop: '16px',
                }}>
                  Ohne Anmeldung: Lernfortschritt bleibt lokal im Browser gespeichert.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
