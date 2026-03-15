'use client';

import { useState, useEffect, useCallback } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import Transcript from '@/app/components/Transcript';
import Link from 'next/link';

const CHAPTERS_KEY = (id: string) => `lernbot_chapters_${id}`;
const DOCS_KEY = 'lernbot_documents';
const PROGRESS_KEY = (id: string) => `lernbot_progress_${id}`;
const SPEED_KEY = 'lernbot_speed';

function getChapters(docId: string): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CHAPTERS_KEY(docId)) || '[]'); } catch { return []; }
}

function saveProgress(docId: string, chapterIndex: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROGRESS_KEY(docId), JSON.stringify({ chapterIndex, ts: Date.now() }));
  try {
    const docs = JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
    const i = docs.findIndex((d: any) => d.id === docId);
    if (i >= 0) { docs[i].progress = chapterIndex / Math.max(1, docs.length); localStorage.setItem(DOCS_KEY, JSON.stringify(docs)); }
  } catch {}
}

function loadProgress(docId: string): { chapterIndex: number } | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY(docId)) || 'null'); } catch { return null; }
}

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [highlightChar, setHighlightChar] = useState(-1);
  const [bionicReading, setBionicReading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [resumePrompt, setResumePrompt] = useState<{ chapterIndex: number } | null>(null);

  const chapter = chapters[currentIndex] || null;
  const progress = chapters.length > 1 ? (currentIndex / (chapters.length - 1)) * 100 : 0;

  useEffect(() => {
    const chs = getChapters(params.id);
    if (!chs.length) { setNotFound(true); setLoading(false); return; }
    setChapters(chs);
    const savedSpeed = parseFloat(localStorage.getItem(SPEED_KEY) || '1.0');
    if (!isNaN(savedSpeed)) setSpeed(savedSpeed);
    const bionic = localStorage.getItem('lernbot_bionic') === 'true';
    setBionicReading(bionic);
    const saved = loadProgress(params.id);
    if (saved && saved.chapterIndex > 0 && saved.chapterIndex < chs.length) {
      setResumePrompt({ chapterIndex: saved.chapterIndex });
    }
    setLoading(false);
  }, [params.id]);

  const goToChapter = useCallback((index: number) => {
    setCurrentIndex(index);
    setHighlightChar(-1);
    saveProgress(params.id, index);
  }, [params.id]);

  const handleBoundary = useCallback((charIndex: number) => {
    setHighlightChar(charIndex);
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    localStorage.setItem(SPEED_KEY, String(s));
  }, []);

  const handleBionicToggle = () => {
    const next = !bionicReading;
    setBionicReading(next);
    localStorage.setItem('lernbot_bionic', String(next));
  };

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Wird geladen...</p>
    </main>
  );

  if (notFound || !chapter) return (
    <main style={{ minHeight: '100vh', padding: '32px' }}>
      <Link href="/"><button style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: '16px' }}>← Zurück</button></Link>
      <p style={{ color: 'var(--text-muted)' }}>Dokument nicht gefunden. <Link href="/" style={{ color: 'var(--navy)' }}>Neu hochladen?</Link></p>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--white)' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--navy)', zIndex: 1000, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <Link href="/"><button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Zurück</button></Link>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Kapitel {currentIndex + 1} / {chapters.length}</span>
          <button onClick={handleBionicToggle} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: bionicReading ? 'var(--gold)' : 'rgba(255,255,255,0.15)', color: bionicReading ? 'var(--navy)' : 'white' }}>
            Bionic {bionicReading ? '✓' : ''}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '88px 2rem 4rem' }}>
        {/* Progress Bar */}
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Resume Prompt */}
        {resumePrompt && (
          <div style={{ background: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#0369a1' }}>📌 Zuletzt bei <strong>Kapitel {resumePrompt.chapterIndex + 1}</strong></span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { goToChapter(resumePrompt.chapterIndex); setResumePrompt(null); }} style={{ padding: '6px 14px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Weiterlesen →</button>
              <button onClick={() => setResumePrompt(null)} style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✕</button>
            </div>
          </div>
        )}

        <h1 style={{ marginBottom: '24px', color: 'var(--text)', fontSize: '22px', fontWeight: 700 }}>{chapter.title}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AudioPlayer
              chapter={chapter}
              documentId={params.id}
              onBoundary={handleBoundary}
              onEnded={() => { if (currentIndex < chapters.length - 1) setTimeout(() => goToChapter(currentIndex + 1), 800); }}
              speed={speed}
              onSpeedChange={handleSpeedChange}
            />
            <Transcript
              text={chapter.cleaned_text || ''}
              highlightCharIndex={highlightChar}
              bionicReading={bionicReading}
            />
          </div>

          {/* Kapitel-Nav */}
          <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', position: 'sticky', top: '80px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>Kapitel</h3>
            <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '12px' }}>
              {chapters.map((ch, i) => (
                <button key={ch.id} onClick={() => goToChapter(i)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: '4px', background: i === currentIndex ? 'var(--navy)' : 'var(--white)', color: i === currentIndex ? 'white' : 'var(--text)', border: i === currentIndex ? 'none' : '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: i === currentIndex ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i + 1}. {ch.title}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => currentIndex > 0 && goToChapter(currentIndex - 1)} disabled={currentIndex === 0} style={{ flex: 1, padding: '8px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '6px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600, opacity: currentIndex === 0 ? 0.4 : 1 }}>← Zurück</button>
              <button onClick={() => currentIndex < chapters.length - 1 && goToChapter(currentIndex + 1)} disabled={currentIndex === chapters.length - 1} style={{ flex: 1, padding: '8px', background: currentIndex === chapters.length - 1 ? 'var(--border)' : 'var(--navy)', color: currentIndex === chapters.length - 1 ? 'var(--text)' : 'white', border: 'none', borderRadius: '6px', cursor: currentIndex === chapters.length - 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600, opacity: currentIndex === chapters.length - 1 ? 0.4 : 1 }}>Weiter →</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
