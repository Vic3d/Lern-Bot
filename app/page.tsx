'use client';

import { useState, useEffect } from 'react';
import { ChapterSidebar } from './components/ChapterSidebar';
import { ChapterView } from './components/ChapterView';
import { TutorChat } from './components/TutorChat';
import { DrawingCanvas } from './components/DrawingCanvas';
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

export default function Home() {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [tutorMode, setTutorMode] = useState(false);

  // Load first chapter on mount
  useEffect(() => {
    if (chapters.length > 0) {
      setSelectedChapter(chapters[0] as Chapter);
    }
  }, []);

  const handleLearnClick = () => {
    setTutorMode(true);
  };

  const handleCanvasScreenshot = (screenshot: string) => {
    // TODO: Send canvas screenshot to tutor
    console.log('Canvas screenshot:', screenshot.slice(0, 50) + '...');
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: 'inherit',
      }}
    >
      {/* Sidebar: Chapters Navigation (40%) */}
      <ChapterSidebar
        onSelectChapter={(ch) => {
          setSelectedChapter(ch);
          setTutorMode(false);
        }}
        selectedId={selectedChapter?.id}
      />

      {/* Main Area (60%) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {tutorMode ? (
          /* Tutor Mode: Chat + Canvas split-vertical */
          <div
            style={{
              display: 'flex',
              height: '100%',
              gap: 0,
            }}
          >
            {/* Chat (60% of right side) */}
            <div style={{ flex: 3, display: 'flex' }}>
              <TutorChat
                kapitelText={selectedChapter?.text || ''}
                onCanvasClick={() => setTutorMode(true)}
              />
            </div>

            {/* Canvas (40% of right side) */}
            <div
              style={{
                flex: 2,
                borderLeft: `1px solid var(--border)`,
                overflow: 'hidden',
              }}
            >
              <DrawingCanvas onScreenshotTaken={handleCanvasScreenshot} />
            </div>
          </div>
        ) : (
          /* Chapter Mode: Display chapter content */
          <ChapterView
            chapter={selectedChapter}
            onLearnClick={handleLearnClick}
          />
        )}
      </div>
    </div>
  );
}
