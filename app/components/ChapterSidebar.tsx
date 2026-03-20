'use client';

import { useState, useEffect } from 'react';
import { Chapter } from '../types';

interface Props {
  chapters: Chapter[];
  activeChapter: Chapter | null;
  onSelectChapter: (chapter: Chapter) => void;
}

const SKRIPT_META: Record<string, { name: string; color: string; emoji: string }> = {
  TME101: { name: 'Ebene Kräftesysteme', color: '#3fb950', emoji: '⚡' },
  TME102: { name: 'Statik ebener Tragwerke', color: '#58a6ff', emoji: '🏗️' },
  TME103: { name: 'Schwerpunkte & Schnittgrößen', color: '#d29922', emoji: '📐' },
};

export default function ChapterSidebar({ chapters, activeChapter, onSelectChapter }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ TME101: true, TME102: false, TME103: false });
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tutor_completed');
      if (stored) setCompleted(JSON.parse(stored));
    } catch {}
  }, []);

  // Listen for external updates
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem('tutor_completed');
        if (stored) setCompleted(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('tutor_progress_update', handler);
    return () => window.removeEventListener('tutor_progress_update', handler);
  }, []);

  const toggleSkript = (skript: string) => {
    setExpanded(prev => ({ ...prev, [skript]: !prev[skript] }));
  };

  const toggleComplete = (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    const newCompleted = { ...completed, [chapterId]: !completed[chapterId] };
    setCompleted(newCompleted);
    localStorage.setItem('tutor_completed', JSON.stringify(newCompleted));
  };

  const grouped = chapters.reduce((acc, ch) => {
    if (!acc[ch.skript]) acc[ch.skript] = [];
    acc[ch.skript].push(ch);
    return acc;
  }, {} as Record<string, Chapter[]>);

  const totalChapters = chapters.length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = totalChapters ? Math.round((completedCount / totalChapters) * 100) : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '24px' }}>🎓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>TM Tutor</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Technische Mechanik</div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>Fortschritt</span>
            <span>{completedCount}/{totalChapters} ({progressPct}%)</span>
          </div>
          <div style={{
            height: '4px',
            background: 'var(--bg-tertiary)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'var(--accent)',
              borderRadius: '2px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.entries(SKRIPT_META).map(([skript, meta]) => {
          const skriptChapters = grouped[skript] || [];
          const skriptCompleted = skriptChapters.filter(ch => completed[ch.id]).length;
          const isExpanded = expanded[skript];

          return (
            <div key={skript}>
              <button
                onClick={() => toggleSkript(skript)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                }}
              >
                <span>{meta.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{skript}</div>
                  <div style={{ fontSize: '11px', color: meta.color }}>{meta.name}</div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {skriptCompleted}/{skriptChapters.length}
                </span>
                <span style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                  fontSize: '10px',
                }}>▼</span>
              </button>

              {isExpanded && (
                <div>
                  {skriptChapters.map(ch => {
                    const isActive = activeChapter?.id === ch.id;
                    const isDone = completed[ch.id];

                    return (
                      <button
                        key={ch.id}
                        onClick={() => onSelectChapter(ch)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px 8px 32px',
                          background: isActive ? 'var(--accent-light)' : 'none',
                          border: 'none',
                          borderLeft: isActive ? `3px solid ${meta.color}` : '3px solid transparent',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '12px',
                        }}
                      >
                        <span
                          onClick={(e) => toggleComplete(e, ch.id)}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isDone ? 'none' : '1px solid var(--border)',
                            background: isDone ? 'var(--accent)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            flexShrink: 0,
                            color: 'white',
                          }}
                        >
                          {isDone ? '✓' : ''}
                        </span>
                        <span style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: isDone ? 0.6 : 1,
                        }}>
                          {ch.kapitel_nr ? `${ch.kapitel_nr} ` : ''}{ch.titel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
