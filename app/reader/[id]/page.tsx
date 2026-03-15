'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import Transcript from '@/app/components/Transcript';
import PDFViewer from '@/app/components/PDFViewer';
import AuthButton from '@/app/components/AuthButton';
import { loadPDF } from '@/lib/pdfStorage';
import { logEvent } from '@/lib/events';
import { getCurrentUserId } from '@/lib/auth';
import Link from 'next/link';

const CHAPTERS_KEY = (id: string) => `lernbot_chapters_${id}`;
const PROGRESS_KEY = (id: string) => `lernbot_progress_${id}`;
const SPEED_KEY = 'lernbot_speed';

function getChapters(docId: string): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CHAPTERS_KEY(docId)) || '[]'); } catch { return []; }
}

function saveProgress(docId: string, chapterIndex: number, charOffset = 0) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROGRESS_KEY(docId), JSON.stringify({ chapterIndex, charOffset, ts: Date.now() }));
}

function loadProgress(docId: string): { chapterIndex: number; charOffset?: number } | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY(docId)) || 'null'); } catch { return null; }
}

// Strip filename prefix from chapter title: "file.pdf — Teil 1" → "Teil 1"
function cleanTitle(title: string): string {
  const sep = title.lastIndexOf(' — ');
  if (sep > 0) return title.substring(sep + 3).trim();
  const sep2 = title.lastIndexOf(' - ');
  if (sep2 > 0 && sep2 > title.length / 2) return title.substring(sep2 + 3).trim();
  return title;
}

/** Returns true if chapters look like auto-split fallback (no real headings detected) */
function isFallbackSplit(chapters: any[]): boolean {
  if (!chapters.length) return false;
  // Fallback titles are "Teil N" or "filename — Teil N"
  return chapters.every(ch =>
    /Teil\s+\d+$/.test(ch.title) || /^Teil\s+\d+$/.test(cleanTitle(ch.title))
  );
}

type ViewMode = 'pdf' | 'text';

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pdf');
  const [highlightChar, setHighlightChar] = useState(-1);
  const [bionicReading, setBionicReading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [resumePrompt, setResumePrompt] = useState<{ chapterIndex: number; charOffset?: number } | null>(null);
  const [ttsSeekTarget, setTtsSeekTarget] = useState<{ char: number; seq: number } | null>(null);
  const seekSeqRef = useRef(0);
  const sessionStartRef = useRef<number>(Date.now());
  const chapterStartRef = useRef<number>(Date.now());
  const userIdRef = useRef<string>('anon');

  const chapter = chapters[currentIndex] || null;
  const progress = chapters.length > 1 ? (currentIndex / (chapters.length - 1)) * 100 : 0;
  const fallbackSplit = isFallbackSplit(chapters);

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const chs = getChapters(params.id);
    if (!chs.length) { setNotFound(true); setLoading(false); return; }
    setChapters(chs);

    const savedSpeed = parseFloat(localStorage.getItem(SPEED_KEY) || '1.0');
    if (!isNaN(savedSpeed)) setSpeed(savedSpeed);

    const bionic = localStorage.getItem('lernbot_bionic') === 'true';
    setBionicReading(bionic);

    const saved = loadProgress(params.id);
    if (saved && (saved.chapterIndex > 0 || (saved.charOffset && saved.charOffset > 0)) && saved.chapterIndex < chs.length) {
      setResumePrompt({ chapterIndex: saved.chapterIndex, charOffset: saved.charOffset ?? 0 });
    }

    loadPDF(params.id).then(bytes => {
      if (bytes) setPdfBytes(new Uint8Array(bytes));
      else setViewMode('text');
    }).catch(() => setViewMode('text'));

    setLoading(false);

    // ─── Event Tracking ─────────────────────────────────────────────────────
    userIdRef.current = getCurrentUserId();
    sessionStartRef.current = Date.now();
    chapterStartRef.current = Date.now();

    const userId = userIdRef.current;
    const docId = params.id;

    logEvent({
      user_id: userId,
      document_id: docId,
      event_type: 'session_start',
      data: { url: window.location.pathname },
    });

    // session_end on page leave
    const handleUnload = () => {
      const sessionSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      logEvent({
        user_id: userId,
        document_id: docId,
        event_type: 'session_end',
        data: { duration_seconds: sessionSeconds },
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [params.id]);

  // ─── Chapter Navigation ─────────────────────────────────────────────────────
  const goToChapter = useCallback((index: number, markPreviousComplete = false) => {
    const userId = userIdRef.current;
    const docId = params.id;

    if (markPreviousComplete && chapters[currentIndex]) {
      const timeSpent = Math.round((Date.now() - chapterStartRef.current) / 1000);
      logEvent({
        user_id: userId,
        document_id: docId,
        chapter_id: chapters[currentIndex]?.id,
        event_type: 'chapter_complete',
        data: {
          chapter_num: chapters[currentIndex]?.chapter_num,
          time_spent_seconds: timeSpent,
        },
      });
    }

    chapterStartRef.current = Date.now();

    if (chapters[index]) {
      logEvent({
        user_id: userId,
        document_id: docId,
        chapter_id: chapters[index]?.id,
        event_type: 'chapter_start',
        data: { chapter_num: chapters[index]?.chapter_num },
      });
    }

    setCurrentIndex(index);
    setHighlightChar(-1);
    setTtsSeekTarget(null);
    seekSeqRef.current = 0;
    saveProgress(docId, index);
  }, [params.id, chapters, currentIndex]);

  const lastSavedCharRef = useRef(0);
  const handleBoundary = useCallback((charIndex: number) => {
    setHighlightChar(charIndex);
    if (Math.abs(charIndex - lastSavedCharRef.current) > 50) {
      lastSavedCharRef.current = charIndex;
      saveProgress(params.id, currentIndex, charIndex);
    }
  }, [params.id, currentIndex]);

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    localStorage.setItem(SPEED_KEY, String(s));
  }, []);

  const handleBionicToggle = () => {
    const next = !bionicReading;
    setBionicReading(next);
    localStorage.setItem('lernbot_bionic', String(next));
  };

  const handleSeekToChar = useCallback((charIdx: number) => {
    seekSeqRef.current += 1;
    setTtsSeekTarget({ char: charIdx, seq: seekSeqRef.current });
  }, []);

  // ─── Loading / Not Found ────────────────────────────────────────────────────
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
            <button
              onClick={() => setViewMode('pdf')}
              disabled={!pdfBytes}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none',
                cursor: pdfBytes ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600,
                background: viewMode === 'pdf' ? 'white' : 'transparent',
                color: viewMode === 'pdf' ? 'var(--navy)' : 'rgba(255,255,255,0.7)',
                opacity: pdfBytes ? 1 : 0.4,
              }}
            >📄 PDF</button>
            <button
              onClick={() => setViewMode('text')}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: viewMode === 'text' ? 'white' : 'transparent',
                color: viewMode === 'text' ? 'var(--navy)' : 'rgba(255,255,255,0.7)',
              }}
            >📝 Text</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {viewMode === 'text' && (
              <button
                onClick={handleBionicToggle}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600,
                  background: bionicReading ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
                  color: bionicReading ? 'var(--navy)' : 'white',
                }}
              >Bionic {bionicReading ? '✓' : ''}</button>
            )}
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
              {currentIndex + 1} / {chapters.length}
            </span>
            <AuthButton />
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>
      </header>

      {/* Body — responsive grid via CSS class */}
      <div className="reader-body">

        {/* Left: PDF or Text */}
        <div className="reader-main" style={{ overflow: 'hidden', height: '100%' }}>
          {viewMode === 'pdf' && pdfBytes ? (
            <PDFViewer
              pdfBytes={pdfBytes}
              chapterText={chapter?.cleaned_text}
              startPage={chapter?.start_page}
              endPage={chapter?.end_page}
              highlightCharIndex={highlightChar}
              onSeekToChar={handleSeekToChar}
            />
          ) : (
            <div style={{ height: '100%', overflowY: 'auto', background: 'var(--white)', padding: '32px' }}>
              {resumePrompt && (
                <div style={{
                  background: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '10px',
                  padding: '12px 16px', marginBottom: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}>
                  <span style={{ fontSize: '13px', color: '#0369a1' }}>
                    📌 Zuletzt bei <strong>Kapitel {resumePrompt.chapterIndex + 1}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { goToChapter(resumePrompt.chapterIndex); setResumePrompt(null); }}
                      style={{ padding: '5px 12px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >Weiter →</button>
                    <button
                      onClick={() => setResumePrompt(null)}
                      style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >✕</button>
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

        {/* Right: Player + Chapter Nav */}
        <div className="reader-sidebar" style={{ background: 'var(--off-white)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Resume Prompt (PDF mode) */}
            {viewMode === 'pdf' && resumePrompt && (
              <div style={{ background: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '12px', color: '#0369a1', marginBottom: '6px' }}>
                  📌 Zuletzt Kap. {resumePrompt.chapterIndex + 1}
                </p>
                <button
                  onClick={() => {
                    goToChapter(resumePrompt.chapterIndex);
                    const offset = resumePrompt.charOffset ?? 0;
                    if (offset > 0) {
                      requestAnimationFrame(() => {
                        setHighlightChar(offset);
                        seekSeqRef.current += 1;
                        setTtsSeekTarget({ char: offset, seq: seekSeqRef.current });
                      });
                    }
                    setResumePrompt(null);
                  }}
                  style={{ padding: '4px 10px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >Weiterlesen →</button>
              </div>
            )}

            {/* AudioPlayer */}
            <AudioPlayer
              chapter={chapter}
              documentId={params.id}
              onBoundary={handleBoundary}
              onEnded={() => {}}
              speed={speed}
              onSpeedChange={handleSpeedChange}
              seekToChar={ttsSeekTarget}
            />

            {/* Chapter Nav */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>📚 Kapitel</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--off-white)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  {currentIndex + 1} / {chapters.length}
                </span>
              </div>

              {/* Fallback-Split Info */}
              {fallbackSplit && (
                <div style={{
                  padding: '8px 12px',
                  background: '#fffbeb',
                  borderBottom: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}>
                  <span style={{ fontSize: '13px', flexShrink: 0 }}>ℹ️</span>
                  <p style={{ fontSize: '11px', color: '#92400e', margin: 0, lineHeight: 1.4 }}>
                    Automatisch in Teile aufgeteilt — keine Kapitelstruktur erkannt.
                  </p>
                </div>
              )}

              {/* Chapter list */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {chapters.map((ch, i) => {
                  const isActive = i === currentIndex;
                  const isDone = i < currentIndex;
                  const mins = Math.ceil((ch.duration_seconds || 60) / 60);
                  const title = cleanTitle(ch.title);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => goToChapter(i, i > currentIndex)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '9px 12px',
                        background: isActive ? 'var(--navy)' : isDone ? '#f8fafc' : 'transparent',
                        color: isActive ? 'white' : 'var(--text)',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '9px',
                        transition: 'background 0.12s',
                      }}
                    >
                      {/* Badge */}
                      <span style={{
                        flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 700,
                        background: isActive ? 'rgba(255,255,255,0.25)'
                          : isDone ? '#dcfce7' : 'var(--off-white)',
                        color: isActive ? 'white' : isDone ? '#16a34a' : 'var(--text-muted)',
                      }}>
                        {isDone ? '✓' : i + 1}
                      </span>

                      {/* Title + meta */}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontSize: '12px',
                          fontWeight: isActive ? 700 : isDone ? 400 : 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          opacity: isDone && !isActive ? 0.6 : 1,
                        }}>
                          {title}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                        }}>
                          ~{mins} Min · {(ch.word_count || 0).toLocaleString('de')} Wörter
                        </span>
                      </span>

                      {/* Active indicator dot */}
                      {isActive && (
                        <span style={{
                          flexShrink: 0, width: '6px', height: '6px',
                          borderRadius: '50%', background: 'var(--gold)',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Prev / Next */}
              <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => currentIndex > 0 && goToChapter(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  style={{
                    flex: 1, padding: '10px', background: 'none',
                    border: 'none', borderRight: '1px solid var(--border)',
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: 600,
                    color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--navy)',
                    opacity: currentIndex === 0 ? 0.4 : 1,
                  }}
                >← Zurück</button>
                <button
                  onClick={() => currentIndex < chapters.length - 1 && goToChapter(currentIndex + 1, true)}
                  disabled={currentIndex === chapters.length - 1}
                  style={{
                    flex: 1, padding: '10px',
                    background: currentIndex < chapters.length - 1 ? 'var(--navy)' : 'none',
                    border: 'none',
                    cursor: currentIndex === chapters.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: 600,
                    color: currentIndex === chapters.length - 1 ? 'var(--text-muted)' : 'white',
                    opacity: currentIndex === chapters.length - 1 ? 0.4 : 1,
                  }}
                >Weiter →</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
