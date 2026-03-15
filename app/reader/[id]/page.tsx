'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import Transcript from '@/app/components/Transcript';
import Link from 'next/link';

const CHAPTERS_KEY_PREFIX = 'lernbot_chapters_';
const STORAGE_KEY = 'lernbot_documents';

function getChaptersFromStorage(docId: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`${CHAPTERS_KEY_PREFIX}${docId}`) || '[]');
  } catch {
    return [];
  }
}

function updateProgressInStorage(docId: string, progress: number) {
  if (typeof window === 'undefined') return;
  try {
    const docs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = docs.findIndex((d: any) => d.id === docId);
    if (idx >= 0) {
      docs[idx].progress = progress;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    }
  } catch {}
}

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [chapter, setChapter] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const chs = getChaptersFromStorage(params.id);
    if (chs.length === 0) {
      setNotFound(true);
    } else {
      setChapters(chs);
      setChapter(chs[0]);
    }
    setLoading(false);
  }, [params.id]);

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const next = currentChapterIndex + 1;
      setCurrentChapterIndex(next);
      setChapter(chapters[next]);
      setAudioError(null);
      updateProgressInStorage(params.id, next / (chapters.length - 1));
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      const prev = currentChapterIndex - 1;
      setCurrentChapterIndex(prev);
      setChapter(chapters[prev]);
      setAudioError(null);
    }
  };

  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setChapter(chapters[index]);
    setAudioError(null);
    updateProgressInStorage(params.id, index / Math.max(1, chapters.length - 1));
  };

  const handleGenerateAudio = async () => {
    if (!chapter || generatingAudio) return;
    setGeneratingAudio(true);
    setAudioError(null);
    try {
      const response = await fetch(`/api/chapters/${chapter.id}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter })
      });
      const data = await response.json();
      if (data.success) {
        const updatedChapter = {
          ...chapter,
          audio_path: data.audio_path,
          audio_status: 'ready',
          duration_seconds: data.duration_seconds || chapter.duration_seconds,
        };
        setChapter(updatedChapter);

        // In localStorage updaten
        const updatedChapters = chapters.map((ch) =>
          ch.id === chapter.id ? updatedChapter : ch
        );
        setChapters(updatedChapters);
        localStorage.setItem(`${CHAPTERS_KEY_PREFIX}${params.id}`, JSON.stringify(updatedChapters));
      } else {
        setAudioError(data.error || 'Audio-Generierung fehlgeschlagen');
      }
    } catch (err: any) {
      setAudioError(`Fehler: ${err.message}`);
    } finally {
      setGeneratingAudio(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Wird geladen...</p>
      </main>
    );
  }

  if (notFound || !chapter) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--white)', padding: '32px' }}>
        <Link href="/">
          <button style={{ color: 'var(--navy)', fontWeight: 600, marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Zurück
          </button>
        </Link>
        <p style={{ color: 'var(--text-muted)' }}>Dokument nicht gefunden oder keine Kapitel. <Link href="/" style={{ color: 'var(--navy)' }}>Neu hochladen?</Link></p>
      </main>
    );
  }

  const progress = ((currentChapterIndex + 1) / chapters.length) * 100;
  const isAudioPending = chapter.audio_status === 'pending' || !chapter.audio_path;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--white)' }}>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'var(--navy)', zIndex: 1000,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto', padding: '0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px'
        }}>
          <Link href="/">
            <button style={{ color: 'var(--white)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
              ← Zurück
            </button>
          </Link>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            Kapitel {currentChapterIndex + 1} von {chapters.length}
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '100px 2rem 4rem' }}>

        {/* Progress Bar */}
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '32px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 0.3s ease' }}></div>
        </div>

        <h1 style={{ marginBottom: '32px', color: 'var(--text)' }}>{chapter.title}</h1>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px', alignItems: 'start' }}>

          {/* Links: Player + Transcript */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Audio-Bereich */}
            {isAudioPending ? (
              <div style={{
                background: 'var(--off-white)', borderRadius: '12px', padding: '32px',
                border: '1px solid var(--border)', textAlign: 'center'
              }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '15px' }}>
                  🎵 <strong>{chapter.title}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
                  Web-Sprachausgabe — direkt im Browser, keine Audio-Datei nötig
                </p>
                {audioError && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
                    padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px'
                  }}>
                    ⚠️ {audioError}
                  </div>
                )}
                <AudioPlayer chapter={chapter} documentId={params.id} />
              </div>
            ) : (
              <AudioPlayer chapter={chapter} documentId={params.id} />
            )}

            {/* Transcript */}
            <Transcript text={chapter.cleaned_text} />
          </div>

          {/* Rechts: Navigation */}
          <div style={{
            background: 'var(--off-white)', border: `1px solid var(--border)`,
            borderRadius: '12px', padding: '24px', position: 'sticky', top: '100px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text)' }}>
              Kapitel
            </h3>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
              {chapters.map((ch, index) => (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(index)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: '6px',
                    background: index === currentChapterIndex ? 'var(--navy)' : 'var(--white)',
                    color: index === currentChapterIndex ? 'var(--white)' : 'var(--text)',
                    border: index === currentChapterIndex ? 'none' : `1px solid var(--border)`,
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {ch.audio_status === 'ready' ? '🔊' : '📄'} {ch.title}
                </button>
              ))}
            </div>

            {/* Nav Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button
                onClick={handlePrevChapter}
                disabled={currentChapterIndex === 0}
                style={{
                  padding: '10px', background: 'var(--white)', color: 'var(--text)',
                  border: `1px solid var(--border)`, borderRadius: '8px',
                  cursor: currentChapterIndex === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '13px', opacity: currentChapterIndex === 0 ? 0.4 : 1
                }}
              >
                ← Zurück
              </button>
              <button
                onClick={handleNextChapter}
                disabled={currentChapterIndex === chapters.length - 1}
                style={{
                  padding: '10px',
                  background: currentChapterIndex === chapters.length - 1 ? 'var(--border)' : 'var(--navy)',
                  color: currentChapterIndex === chapters.length - 1 ? 'var(--text)' : 'var(--white)',
                  border: 'none', borderRadius: '8px',
                  cursor: currentChapterIndex === chapters.length - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '13px',
                  opacity: currentChapterIndex === chapters.length - 1 ? 0.4 : 1
                }}
              >
                Weiter →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
