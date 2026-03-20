'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ChapterSidebar from './components/ChapterSidebar';
import { Chapter } from './types';
import ChapterView from './components/ChapterView';
import TutorChat from './components/TutorChat';
import DrawingCanvas, { DrawingCanvasRef } from './components/DrawingCanvas';

type RightPanel = 'chat' | 'canvas' | 'split';

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  useEffect(() => {
    fetch('/api/chapters')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChapters(data);
        }
      })
      .catch(err => console.error('Failed to load chapters:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectChapter = (chapter: Chapter) => {
    setActiveChapter(chapter);
  };

  const handleStartLearning = () => {
    setRightPanel('chat');
    setInitialPrompt('Erkläre mir dieses Kapitel Schritt für Schritt. Beginne mit dem Wichtigsten und nutze anschauliche Beispiele. Welche Kernkonzepte muss ich verstehen?');
  };

  const getCanvasImage = useCallback((): string | null => {
    return canvasRef.current?.getImageData() || null;
  }, []);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}>
        <span style={{ fontSize: '3rem' }}>🎓</span>
        <h2 style={{ fontSize: '1.25rem' }}>TM Tutor wird geladen...</h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Top Bar */}
      <header style={{
        height: '48px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        gap: '1rem',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: '0.3rem 0.5rem',
            background: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.2rem',
          }}
        >
          ☰
        </button>
        <h1 style={{
          fontSize: '1rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-primary)',
        }}>
          <span style={{
            background: 'var(--accent)',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
          }}>
            🎓
          </span>
          TM Tutor
        </h1>

        {activeChapter && (
          <span style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {activeChapter.skript} → {activeChapter.titel}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
          {(['chat', 'canvas', 'split'] as RightPanel[]).map(panel => (
            <button
              key={panel}
              onClick={() => setRightPanel(panel)}
              style={{
                padding: '0.3rem 0.6rem',
                background: rightPanel === panel ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: rightPanel === panel ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
              }}
            >
              {panel === 'chat' ? '💬 Chat' : panel === 'canvas' ? '✏️ Canvas' : '📐 Beides'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: '280px',
            flexShrink: 0,
            height: '100%',
            overflow: 'hidden',
          }}>
            <ChapterSidebar
              chapters={chapters}
              activeChapter={activeChapter}
              onSelectChapter={handleSelectChapter}
            />
          </div>
        )}

        {/* Left Panel — Chapter View */}
        <div style={{
          width: sidebarOpen ? 'calc(40% - 280px)' : '40%',
          minWidth: '250px',
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
        }}>
          <ChapterView
            chapter={activeChapter}
            onStartLearning={handleStartLearning}
          />
        </div>

        {/* Right Panel — Chat + Canvas */}
        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {rightPanel === 'chat' && (
            <TutorChat
              chapter={activeChapter}
              initialPrompt={initialPrompt}
              onClearInitialPrompt={() => setInitialPrompt(null)}
              onSendCanvasImage={getCanvasImage}
            />
          )}

          {rightPanel === 'canvas' && (
            <DrawingCanvas ref={canvasRef} />
          )}

          {rightPanel === 'split' && (
            <>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <TutorChat
                  chapter={activeChapter}
                  initialPrompt={initialPrompt}
                  onClearInitialPrompt={() => setInitialPrompt(null)}
                  onSendCanvasImage={getCanvasImage}
                />
              </div>
              <div style={{ height: '40%', flexShrink: 0 }}>
                <DrawingCanvas ref={canvasRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
