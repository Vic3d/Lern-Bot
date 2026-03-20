'use client';

import { useState, useEffect } from 'react';
import chapters from '@/data/all_chapters.json';

interface Chapter {
  id: string;
  skript: string;
  kapitel_nr: string;
  titel: string;
  text: string;
  seite_von: number;
  seite_bis: number;
}

interface ChapterSidebarProps {
  onSelectChapter: (chapter: Chapter) => void;
  selectedId?: string;
}

export function ChapterSidebar({ onSelectChapter, selectedId }: ChapterSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    TME101: true,
    TME102: false,
    TME103: false,
  });
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('completed_chapters');
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    }
  }, []);

  const grouped: Record<string, Chapter[]> = {
    TME101: [],
    TME102: [],
    TME103: [],
  };

  (chapters as Chapter[]).forEach((ch) => {
    if (grouped[ch.skript]) {
      grouped[ch.skript].push(ch);
    }
  });

  const toggleExpanded = (skript: string) => {
    setExpanded((prev) => ({ ...prev, [skript]: !prev[skript] }));
  };

  const toggleComplete = (id: string) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
    localStorage.setItem('completed_chapters', JSON.stringify(Array.from(newCompleted)));
  };

  return (
    <div
      style={{
        width: '40%',
        background: 'var(--bg-secondary)',
        borderRight: `1px solid var(--border)`,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: `1px solid var(--border)` }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          📚 Kapitel
        </h2>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          3 Skripte, 30 Kapitel
        </p>
      </div>

      {/* Scripts List */}
      <div style={{ flex: 1 }}>
        {(['TME101', 'TME102', 'TME103'] as const).map((skript) => (
          <div key={skript}>
            {/* Skript Header */}
            <button
              onClick={() => toggleExpanded(skript)}
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid var(--border)`,
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{expanded[skript] ? '▼' : '▶'}</span>
              <span style={{ flex: 1 }}>{skript}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ({grouped[skript].length})
              </span>
            </button>

            {/* Chapters */}
            {expanded[skript] && (
              <div style={{ background: 'var(--bg-tertiary)' }}>
                {grouped[skript].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChapter(ch)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.5rem 0.75rem 2.5rem',
                      background: selectedId === ch.id ? 'var(--accent-light)' : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid var(--border)`,
                      color: selectedId === ch.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedId !== ch.id) {
                        e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedId !== ch.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completed.has(ch.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleComplete(ch.id);
                      }}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ flex: 1 }}>
                      {ch.kapitel_nr} {ch.titel}
                    </span>
                    {completed.has(ch.id) && (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
