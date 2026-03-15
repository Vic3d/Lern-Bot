'use client';

import { useState, useEffect, useCallback } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import Transcript from '@/app/components/Transcript';
import Link from 'next/link';

const CHAPTERS_KEY_PREFIX = 'lernbot_chapters_';
const STORAGE_KEY = 'lernbot_documents';
const PROGRESS_KEY_PREFIX = 'lernbot_progress_';

function getChaptersFromStorage(docId: string): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(`${CHAPTERS_KEY_PREFIX}${docId}`) || '[]'); }
  catch { return []; }
}

function updateProgressInStorage(docId: string, progress: number) {
  if (typeof window === 'undefined') return;
  try {
    const docs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = docs.findIndex((d: any) => d.id === docId);
    if (idx >= 0) { docs[idx].progress = progress; localStorage.setItem(STORAGE_KEY, JSON.stringify(docs)); }
  } catch {}
}

function saveChapterProgress(docId: string, chapterIndex: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${PROGRESS_KEY_PREFIX}${docId}`, JSON.stringify({ chapterIndex, timestamp: Date.now() }));
}

function loadChapterProgress(docId: string): { chapterIndex: number; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${docId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getStoredSpeed(): number {
  if (typeof window === 'undefined') return 1.0;
  const s = localStorage.getItem('lernbot_speed');
  if (!s) return 1.0;
  const p = parseFloat(s);
  return isNaN(p) ? 1.0 : p;
}

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [chapter, setChapter] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [activeCharIndex, setActiveCharIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const [resumeBanner, setResumeBanner] = useState<{ chapterIndex: number; chapterTitle: string } | null>(null);

  useEffect(() => {
    setSpeed(getStoredSpeed());
    const chs = getChaptersFromStorage(params.id);
    if (chs.length === 0) {
      setNotFound(true);
    } else {
      setChapters(chs);
      const saved = loadChapterProgress(params.id);
      if (saved && saved.chapterIndex > 0 && saved.chapterIndex < chs.length) {
        setChapter(chs[0]);
        setCurrentChapterIndex(0);
        setResumeBanner({ chapterIndex: saved.chapterIndex, chapterTitle: chs[saved.chapterIndex]?.title || `Kapitel ${saved.chapterIndex + 1}` });
      } else {
        setChapter(chs[0]);
      }
    }
    setLoading(false);
  }, [params.id]);

  const goToChapter = useCallback((index: number) => {
    if (index < 0 || index >= chapters.length) return;
    setCurrentChapterIndex(index);
    setChapter(chapters[index]);
    setAudioError(null);
    setActiveCharIndex(-1);
    setResumeBanner(null);
    saveChapterProgress(params.id, index);
    updateProgressInStorage(params.id, index / Math.max(1, chapters.length - 1));
  }, [chapters, params.id]);

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    localStorage.setItem('lernbot_speed', String(s));
  };

  const handleNextChapter = () => { if (currentChapterIndex < chapters.length - 1) goToChapter(currentChapterIndex + 1); };
  const handlePrevChapter = () => { if (currentChapterIndex > 0) goToChapter(currentChapterIndex - 1); };
  const handleResume = () => { if (resumeBanner) goToChapter(resumeBanner.chapterIndex); setResumeBanner(null); };
  const handleDismissResume = () => setResumeBanner(null);

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
        <Link href="/"><button style={{ color: 'var(--navy)', fontWeight: 600, marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>Zurueck</button></Link>
        <p style={{ color: 'var(--text-muted)' }}>Dokument nicht gefunden. <Link href="/" style={{ color: 'var(--navy)' }}>Neu hochladen?</Link></p>
      </main>
    );
  }

  const progress = ((currentChapterIndex + 1) / chapters.length) * 100;
  const isAudioPending = chapter.audio_status === 'pending' || !chapter.audio_path;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--white)' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--navy)', zIndex: 1000, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
          <Link href="/"><button style={{ color: 'var(--white)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>Zurueck</button></Link>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Kapitel {currentChapterIndex + 1} von {chapters.length}</div>
        </div>
      </header>

      {resumeBanner && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: 'var(--navy)', color: 'var(--white)',
          borderRadius: '12px', padding: '16px 24px',
          boxShadow: '0 8px 32px rgba(27,58,140,0.35)',
          display: 'flex', alignItems: 'center', gap: '16px',
          maxWidth: '520px', width: 'calc(100% - 4rem)',
          border: '2px solid var(--gold)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: '2px', fontSize: '14px' }}>Weiter lesen ab Kapitel {resumeBanner.chapterIndex + 1}?</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumeBanner.chapterTitle}</div>
          </div>
          <button onClick={handleResume} style={{ background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            Weiter lesen
          </button>
          <button onClick={handleDismissResume} style={{ background: 'none', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>x</button>
        </div>
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '100px 2rem 4rem' }}>
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '32px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
        </div>

        <h1 style={{ marginBottom: '32px', color: 'var(--text)' }}>{chapter.title}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {isAudioPending ? (
              <div style={{ background: 'var(--off-white)', borderRadius: '12px', padding: '32px', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '15px' }}>{chapter.title}</p>
                {audioError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{audioError}</div>
                )}
                <AudioPlayer chapter={chapter} documentId={params.id} onBoundary={setActiveCharIndex} speed={speed} onSpeedChange={handleSpeedChange} />
              </div>
            ) : (
              <AudioPlayer chapter={chapter} documentId={params.id} onBoundary={setActiveCharIndex} speed={speed} onSpeedChange={handleSpeedChange} />
            )}

            <Transcript text={chapter.cleaned_text} activeCharIndex={activeCharIndex} />
          </div>

          <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', position: 'sticky', top: '100px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text)' }}>Kapitel</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
              {chapters.map((ch, index) => (
                <button key={ch.id} onClick={() => goToChapter(index)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: '6px',
                  background: index === currentChapterIndex ? 'var(--navy)' : 'var(--white)',
                  color: index === currentChapterIndex ? 'var(--white)' : 'var(--text)',
                  border: index === currentChapterIndex ? 'none' : '1px solid var(--border)',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {ch.audio_status === 'ready' ? 'Audio' : 'Text'} {ch.title}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button onClick={handlePrevChapter} disabled={currentChapterIndex === 0} style={{ padding: '10px', background: 'var(--white)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', cursor: currentChapterIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', opacity: currentChapterIndex === 0 ? 0.4 : 1 }}>Zurueck</button>
              <button onClick={handleNextChapter} disabled={currentChapterIndex === chapters.length - 1} style={{ padding: '10px', background: currentChapterIndex === chapters.length - 1 ? 'var(--border)' : 'var(--navy)', color: currentChapterIndex === chapters.length - 1 ? 'var(--text)' : 'var(--white)', border: 'none', borderRadius: '8px', cursor: currentChapterIndex === chapters.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', opacity: currentChapterIndex === chapters.length - 1 ? 0.4 : 1 }}>Weiter</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
