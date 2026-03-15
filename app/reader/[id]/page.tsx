'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import Transcript from '@/app/components/Transcript';
import PDFViewer from '@/app/components/PDFViewer';
import { loadPDF } from '@/lib/pdfStorage';
import Link from 'next/link';

const CHAPTERS_KEY = (id: string) => `lernbot_chapters_${id}`;
const PROGRESS_KEY = (id: string) => `lernbot_progress_${id}`;
const SPEED_KEY = 'lernbot_speed';

function getChapters(docId: string): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CHAPTERS_KEY(docId)) || '[]'); } catch { return []; }
}

function saveProgress(docId: string, chapterIndex: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROGRESS_KEY(docId), JSON.stringify({ chapterIndex, ts: Date.now() }));
}

function loadProgress(docId: string): { chapterIndex: number } | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY(docId)) || 'null'); } catch { return null; }
}

type ViewMode = 'pdf' | 'text';

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pdf');
  const [highlightChar, setHighlightChar] = useState(-1);
  const [bionicReading, setBionicReading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [resumePrompt, setResumePrompt] = useState<{ chapterIndex: number } | null>(null);
  const [pdfPage, setPdfPage] = useState(1);

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

    // PDF aus IndexedDB laden
    loadPDF(params.id).then(bytes => {
      if (bytes) setPdfBytes(bytes);
      else setViewMode('text'); // kein PDF → Text-Ansicht
    }).catch(() => setViewMode('text'));

    setLoading(false);
  }, [params.id]);

  // Kapitelwechsel → PDF-Seite anpassen
  useEffect(() => {
    if (!chapters.length) return;
    const approxPage = Math.round((currentIndex / Math.max(1, chapters.length - 1)) * 100) + 1;
    setPdfPage(approxPage);
  }, [currentIndex, chapters.length]);

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
      <Link href="/"><button style={{ color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Zurück</button></Link>
      <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Dokument nicht gefunden. <Link href="/" style={{ color: 'var(--navy)' }}>Neu hochladen?</Link></p>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#525659' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--navy)', zIndex: 1000, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '100%', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', gap: '12px' }}>
          <Link href="/"><button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>← Zurück</button></Link>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            <button onClick={() => setViewMode('pdf')} disabled={!pdfBytes} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: pdfBytes ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, background: viewMode === 'pdf' ? 'white' : 'transparent', color: viewMode === 'pdf' ? 'var(--navy)' : 'rgba(255,255,255,0.7)', opacity: pdfBytes ? 1 : 0.4 }}>
              📄 PDF
            </button>
            <button onClick={() => setViewMode('text')} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: viewMode === 'text' ? 'white' : 'transparent', color: viewMode === 'text' ? 'var(--navy)' : 'rgba(255,255,255,0.7)' }}>
              📝 Text
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {viewMode === 'text' && (
              <button onClick={handleBionicToggle} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: bionicReading ? 'var(--gold)' : 'rgba(255,255,255,0.15)', color: bionicReading ? 'var(--navy)' : 'white' }}>
                Bionic {bionicReading ? '✓' : ''}
              </button>
            )}
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
              {currentIndex + 1} / {chapters.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100vh', paddingTop: '63px' }}>

        {/* Links: PDF oder Text */}
        <div style={{ overflow: 'hidden', height: '100%' }}>
          {viewMode === 'pdf' && pdfBytes ? (
            <PDFViewer pdfBytes={pdfBytes} currentPage={pdfPage} onPageChange={setPdfPage} />
          ) : (
            <div style={{ height: '100%', overflowY: 'auto', background: 'var(--white)', padding: '32px' }}>
              {resumePrompt && (
                <div style={{ background: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#0369a1' }}>📌 Zuletzt bei <strong>Kapitel {resumePrompt.chapterIndex + 1}</strong></span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { goToChapter(resumePrompt.chapterIndex); setResumePrompt(null); }} style={{ padding: '5px 12px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Weiter →</button>
                    <button onClick={() => setResumePrompt(null)} style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                </div>
              )}
              <Transcript
                text={chapter.cleaned_text || ''}
                highlightCharIndex={highlightChar}
                bionicReading={bionicReading}
              />
            </div>
          )}
        </div>

        {/* Rechts: Player + Chapter Nav */}
        <div style={{ background: 'var(--off-white)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Resume Prompt (PDF mode) */}
            {viewMode === 'pdf' && resumePrompt && (
              <div style={{ background: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '12px', color: '#0369a1', marginBottom: '6px' }}>📌 Zuletzt Kap. {resumePrompt.chapterIndex + 1}</p>
                <button onClick={() => { goToChapter(resumePrompt.chapterIndex); setResumePrompt(null); }} style={{ padding: '4px 10px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Weiterlesen →</button>
              </div>
            )}

            {/* AudioPlayer */}
            <AudioPlayer
              chapter={chapter}
              documentId={params.id}
              onBoundary={handleBoundary}
              onEnded={() => { if (currentIndex < chapters.length - 1) setTimeout(() => goToChapter(currentIndex + 1), 800); }}
              speed={speed}
              onSpeedChange={handleSpeedChange}
            />

            {/* Chapter Nav */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>Kapitel</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
                {chapters.map((ch, i) => (
                  <button key={ch.id} onClick={() => goToChapter(i)} style={{ width: '100%', textAlign: 'left', padding: '7px 9px', marginBottom: '3px', background: i === currentIndex ? 'var(--navy)' : 'transparent', color: i === currentIndex ? 'white' : 'var(--text)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: i === currentIndex ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}. {ch.title}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => currentIndex > 0 && goToChapter(currentIndex - 1)} disabled={currentIndex === 0} style={{ flex: 1, padding: '7px', background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: '6px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600, opacity: currentIndex === 0 ? 0.4 : 1 }}>← Zurück</button>
                <button onClick={() => currentIndex < chapters.length - 1 && goToChapter(currentIndex + 1)} disabled={currentIndex === chapters.length - 1} style={{ flex: 1, padding: '7px', background: currentIndex === chapters.length - 1 ? 'var(--border)' : 'var(--navy)', color: currentIndex === chapters.length - 1 ? 'var(--text)' : 'white', border: 'none', borderRadius: '6px', cursor: currentIndex === chapters.length - 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600, opacity: currentIndex === chapters.length - 1 ? 0.4 : 1 }}>Weiter →</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
