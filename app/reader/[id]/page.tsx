'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import Transcript from '@/app/components/Transcript';
import Link from 'next/link';

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [chapter, setChapter] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  useEffect(() => {
    fetchChapters();
  }, [params.id]);

  const fetchChapters = async () => {
    try {
      const response = await fetch(`/api/documents/${params.id}/chapters`);
      const data = await response.json();
      setChapters(data.chapters || []);
      if (data.chapters && data.chapters.length > 0) {
        setChapter(data.chapters[0]);
        setCurrentChapterIndex(0);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setChapter(chapters[currentChapterIndex + 1]);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setChapter(chapters[currentChapterIndex - 1]);
    }
  };

  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setChapter(chapters[index]);
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Dokument wird geladen...</p>
        </div>
      </main>
    );
  }

  if (!chapter) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--white)', padding: '32px' }}>
        <Link href="/">
          <button style={{ color: 'var(--navy)', fontWeight: 600, marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Zurück
          </button>
        </Link>
        <p style={{ color: 'var(--text-muted)' }}>Keine Kapitel gefunden</p>
      </main>
    );
  }

  const progress = ((currentChapterIndex + 1) / chapters.length) * 100;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--white)' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'var(--navy)',
        zIndex: 1000,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px'
        }}>
          <Link href="/">
            <button style={{
              color: 'var(--white)',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              ← Zurück
            </button>
          </Link>
          <div style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)'
          }}>
            Kapitel {currentChapterIndex + 1} von {chapters.length}
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '100px 2rem 4rem'
      }}>
        
        {/* Progress */}
        <div style={{
          height: '4px',
          background: 'var(--border)',
          borderRadius: '2px',
          marginBottom: '32px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              background: 'var(--gold)',
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }}
          ></div>
        </div>

        <h1 style={{ marginBottom: '32px', color: 'var(--text)' }}>
          {chapter.title}
        </h1>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '32px',
          alignItems: 'start'
        }}>
          
          {/* Left: Player + Transcript */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <AudioPlayer chapter={chapter} documentId={params.id} />
            <Transcript text={chapter.cleaned_text} />
          </div>

          {/* Right: Navigation */}
          <div style={{
            background: 'var(--off-white)',
            border: `1px solid var(--border)`,
            borderRadius: '12px',
            padding: '24px',
            position: 'sticky',
            top: '100px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              marginBottom: '16px',
              color: 'var(--text)'
            }}>
              Kapitel
            </h3>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '16px'
            }}>
              {chapters.map((ch, index) => (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(index)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px',
                    marginBottom: '8px',
                    background: index === currentChapterIndex ? 'var(--navy)' : 'var(--white)',
                    color: index === currentChapterIndex ? 'var(--white)' : 'var(--text)',
                    border: index === currentChapterIndex ? 'none' : `1px solid var(--border)`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (index !== currentChapterIndex) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--border)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentChapterIndex) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--white)';
                    }
                  }}
                >
                  {ch.title}
                </button>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button
                onClick={handlePrevChapter}
                disabled={currentChapterIndex === 0}
                style={{
                  padding: '10px',
                  background: currentChapterIndex === 0 ? 'var(--border)' : 'var(--white)',
                  color: 'var(--text)',
                  border: `1px solid var(--border)`,
                  borderRadius: '8px',
                  cursor: currentChapterIndex === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  opacity: currentChapterIndex === 0 ? 0.5 : 1,
                  transition: 'all 0.2s ease'
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
                  border: 'none',
                  borderRadius: '8px',
                  cursor: currentChapterIndex === chapters.length - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  opacity: currentChapterIndex === chapters.length - 1 ? 0.5 : 1,
                  transition: 'all 0.2s ease'
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
