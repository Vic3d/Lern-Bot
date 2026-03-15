'use client';
// LEARN-FEATURES: Erklär-Modus Komponente

import { useState, useRef, useEffect } from 'react';

type ExplainStyle = 'simple' | 'analogy' | 'step_by_step' | 'example';

interface ExplainButtonProps {
  text: string;
  chapterContext?: string;
}

const STYLE_LABELS: Record<ExplainStyle, string> = {
  simple: '💬 Einfach',
  analogy: '🔗 Analogie',
  step_by_step: '📋 Schritt-für-Schritt',
  example: '💡 Beispiel',
};

export default function ExplainButton({ text, chapterContext }: ExplainButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<ExplainStyle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const explain = async (style: ExplainStyle) => {
    setShowDropdown(false);
    setLoading(true);
    setError(null);
    setExplanation(null);
    setActiveStyle(style);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, chapter_context: chapterContext, style }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'no_api_key' ? 'api_key' :
                 data.error === 'rate_limit' ? 'rate_limit' : 'generic');
      } else {
        setExplanation(data.explanation);
      }
    } catch {
      setError('generic');
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    setExplanation(null);
    setError(null);
    setActiveStyle(null);
  };

  return (
    <div ref={containerRef} style={{ display: 'inline-block', position: 'relative' }}>
      {/* Main trigger button */}
      <button
        onClick={() => {
          if (explanation || error) { dismiss(); return; }
          setShowDropdown(v => !v);
        }}
        title="Diesen Abschnitt erklären lassen"
        style={{
          background: '#E8B800',
          color: '#1a1a1a',
          border: 'none',
          borderRadius: '6px',
          padding: '3px 9px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 700,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}
      >
        💡 Erklär
      </button>

      {/* Style dropdown */}
      {showDropdown && (
        <div style={dropdownStyle}>
          {(Object.keys(STYLE_LABELS) as ExplainStyle[]).map(style => (
            <button
              key={style}
              onClick={() => explain(style)}
              style={dropdownItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={explanationBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
              {activeStyle ? STYLE_LABELS[activeStyle] : '💡'} — wird erklärt...
            </span>
          </div>
          {[95, 85, 70].map((w, i) => (
            <div key={i} style={{
              height: '12px', borderRadius: '4px', marginBottom: '6px',
              background: 'linear-gradient(90deg, #fde68a 25%, #fef3c7 50%, #fde68a 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
              width: `${w}%`,
            }} />
          ))}
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ ...explanationBoxStyle, background: '#fee2e2', border: '1px solid #fca5a5' }}>
          {error === 'api_key' && <p style={{ fontSize: '12px', margin: 0, color: '#dc2626' }}>🔑 Claude API Key in <code>.env.local</code> eintragen</p>}
          {error === 'rate_limit' && <p style={{ fontSize: '12px', margin: 0, color: '#b45309' }}>⏳ Bitte warte einen Moment...</p>}
          {error === 'generic' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '12px', margin: 0, color: '#dc2626' }}>❌ Fehler beim Laden</p>
              <button
                onClick={() => activeStyle && explain(activeStyle)}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
              >Retry</button>
            </div>
          )}
          <button
            onClick={dismiss}
            style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}
          >✕</button>
        </div>
      )}

      {/* Explanation card */}
      {explanation && (
        <div style={explanationBoxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
              {activeStyle ? STYLE_LABELS[activeStyle] : '💡 Erklärung'}
            </span>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1 }}
            >✕</button>
          </div>
          <p style={{ fontSize: '13px', color: '#451a03', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {explanation}
          </p>
          {/* Restyle with other mode */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(Object.keys(STYLE_LABELS) as ExplainStyle[])
              .filter(s => s !== activeStyle)
              .map(style => (
                <button
                  key={style}
                  onClick={() => explain(style)}
                  style={{
                    background: '#fde68a', color: '#92400e', border: 'none', borderRadius: '4px',
                    padding: '2px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                  }}
                >{STYLE_LABELS[style]}</button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  zIndex: 1000,
  minWidth: '180px',
  overflow: 'hidden',
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 14px',
  background: 'white',
  border: 'none',
  borderBottom: '1px solid #f1f5f9',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: '#1e293b',
  transition: 'background 0.1s',
};

const explanationBoxStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '6px',
  background: '#fefce8',
  border: '1px solid #fde68a',
  borderRadius: '10px',
  padding: '12px 14px',
  zIndex: 1000,
  width: '300px',
  maxWidth: '90vw',
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
};
