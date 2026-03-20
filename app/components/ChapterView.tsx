'use client';

import { useEffect, useRef } from 'react';
import { Chapter } from '../types';

interface Props {
  chapter: Chapter | null;
  onStartLearning: () => void;
}

export default function ChapterView({ chapter, onStartLearning }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggleComplete = () => {
    if (!chapter) return;
    try {
      const stored = JSON.parse(localStorage.getItem('tutor_completed') || '{}');
      stored[chapter.id] = !stored[chapter.id];
      localStorage.setItem('tutor_completed', JSON.stringify(stored));
      window.dispatchEvent(new Event('tutor_progress_update'));
    } catch {}
  };

  if (!chapter) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--text-muted)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '3rem' }}>📖</span>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Wähle ein Kapitel aus der Sidebar</p>
        <p style={{ fontSize: '0.85rem' }}>Klicke auf ein Kapitel links, um loszulegen</p>
      </div>
    );
  }

  // Show first ~2000 chars
  const summaryText = chapter.text.slice(0, 2000);

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '1.5rem',
      background: 'var(--bg-primary)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.2rem 0.5rem',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            borderRadius: '4px',
            fontWeight: 600,
          }}>
            {chapter.skript}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Seite {chapter.seite_von}–{chapter.seite_bis} · {chapter.word_count} Wörter
          </span>
        </div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '1rem', lineHeight: 1.3 }}>
          {chapter.titel}
        </h1>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={onStartLearning}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            🎓 Dieses Kapitel lernen
          </button>
          <button
            onClick={handleToggleComplete}
            style={{
              padding: '0.6rem 1rem',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              border: '1px solid var(--border)',
            }}
          >
            ✅ Als gelernt markieren
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} style={{
        fontSize: '0.88rem',
        lineHeight: 1.7,
        color: 'var(--text-secondary)',
      }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.75rem' }}>
          📄 Kapitelinhalt
        </h3>
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
          {summaryText}
          {chapter.text.length > 2000 && (
            <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: '1rem' }}>
              [...{chapter.word_count} Wörter insgesamt — frag den Tutor für Details]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
