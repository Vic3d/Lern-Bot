'use client';
// LEARN-FEATURES: Kapitel-Zusammenfassung Komponente

import { useState, useEffect, useCallback } from 'react';

interface ChapterSummaryProps {
  chapterId: string;
  chapterText: string;
  chapterTitle: string;
}

const CACHE_KEY = (id: string) => `lernflow_summary_${id}`;
const OPEN_KEY = (id: string) => `lernflow_summary_open_${id}`;

export default function ChapterSummary({ chapterId, chapterText, chapterTitle }: ChapterSummaryProps) {
  const [summary, setSummary] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  // Load from cache on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = localStorage.getItem(CACHE_KEY(chapterId));
    if (cached) {
      try {
        setSummary(JSON.parse(cached));
      } catch { /* ignore */ }
    }
    // Restore open/closed state (default open for first time)
    const savedOpen = localStorage.getItem(OPEN_KEY(chapterId));
    if (savedOpen !== null) {
      setIsOpen(savedOpen === 'true');
      setFirstLoad(false);
    }
  }, [chapterId]);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OPEN_KEY(chapterId), String(next));
    }
  };

  const generate = useCallback(async (invalidateCache = false) => {
    if (invalidateCache && typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY(chapterId));
    }
    setLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const res = await fetch(`/api/chapters/${chapterId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_text: chapterText, chapter_title: chapterTitle }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'no_api_key') {
          setError('api_key');
        } else if (data.error === 'rate_limit') {
          setError('rate_limit');
        } else {
          setError('generic');
        }
        return;
      }

      const bullets: string[] = data.summary || [];
      setSummary(bullets);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY(chapterId), JSON.stringify(bullets));
      }
    } catch {
      setError('generic');
    } finally {
      setLoading(false);
    }
  }, [chapterId, chapterText, chapterTitle]);

  const containerStyle: React.CSSProperties = {
    background: '#f0f9ff',
    border: '1px solid #0284c7',
    borderRadius: '12px',
    marginBottom: '20px',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    cursor: 'pointer',
    userSelect: 'none',
    gap: '8px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0369a1',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={containerStyle}>
      {/* Header — always visible */}
      <div style={headerStyle} onClick={toggleOpen} role="button" aria-expanded={isOpen}>
        <span style={titleStyle}>📋 Zusammenfassung</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {summary && !loading && (
            <button
              onClick={e => { e.stopPropagation(); generate(true); }}
              title="Neu generieren"
              style={{
                background: 'none', border: '1px solid #0284c7', borderRadius: '5px',
                padding: '2px 8px', cursor: 'pointer', fontSize: '11px',
                color: '#0284c7', fontWeight: 600,
              }}
            >↺ Neu</button>
          )}
          <span style={{ color: '#0284c7', fontSize: '13px', fontWeight: 700 }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Collapsible body */}
      {isOpen && (
        <div style={{ padding: '0 14px 14px 14px' }}>
          {/* Error states */}
          {error === 'api_key' && (
            <div style={{ fontSize: '13px', color: '#0369a1', background: '#e0f2fe', borderRadius: '8px', padding: '10px 12px' }}>
              🔑 <strong>Claude API Key</strong> in <code>.env.local</code> eintragen für KI-Features
            </div>
          )}
          {error === 'rate_limit' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#b45309' }}>⏳ Bitte warte einen Moment...</span>
              <button onClick={() => generate()} style={retryBtnStyle}>Nochmal versuchen</button>
            </div>
          )}
          {error === 'generic' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#dc2626' }}>❌ Fehler beim Laden</span>
              <button onClick={() => generate()} style={retryBtnStyle}>Nochmal versuchen</button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[80, 90, 70].map((w, i) => (
                <div key={i} style={{
                  height: '14px', borderRadius: '6px',
                  background: 'linear-gradient(90deg, #bae6fd 25%, #e0f2fe 50%, #bae6fd 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite',
                  width: `${w}%`,
                }} />
              ))}
              <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
          )}

          {/* Summary bullets */}
          {!loading && !error && summary && summary.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {summary.map((point, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#0c4a6e', lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, color: '#0284c7', fontWeight: 700 }}>•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {/* No summary yet → Generate button */}
          {!loading && !error && !summary && (
            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <button
                onClick={() => generate()}
                style={{
                  background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '8px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                }}
              >
                ✨ Zusammenfassung generieren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const retryBtnStyle: React.CSSProperties = {
  background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px',
  padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, flexShrink: 0,
};
