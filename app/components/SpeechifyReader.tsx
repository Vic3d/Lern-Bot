'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechifyReaderProps {
  text: string;
  onClose: () => void;
}

function splitIntoSentences(text: string): string[] {
  // Split on ". ", "! ", "? ", and double newlines
  const raw = text
    .split(/(?<=\.)\s+|(?<=!)\s+|(?<=\?)\s+|\n\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return raw;
}

export default function SpeechifyReader({ text, onClose }: SpeechifyReaderProps) {
  const sentences = useRef<string[]>(splitIntoSentences(text));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const speedRef = useRef(1.0);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Scroll active sentence into view
  useEffect(() => {
    const el = sentenceRefs.current[currentIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakFrom = useCallback((index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const s = sentences.current;
    if (index >= s.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    setCurrentIndex(index);
    currentIndexRef.current = index;
    setIsPlaying(true);
    isPlayingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(s[index]);
    utterance.rate = speedRef.current;
    utterance.lang = 'de-DE';

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      const next = currentIndexRef.current + 1;
      if (next < s.length) {
        speakFrom(next);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    utterance.onerror = () => {
      const next = currentIndexRef.current + 1;
      if (isPlayingRef.current && next < s.length) {
        speakFrom(next);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      speakFrom(currentIndex);
    }
  };

  const handlePrev = () => {
    const prev = Math.max(0, currentIndex - 1);
    window.speechSynthesis?.cancel();
    if (isPlaying) {
      speakFrom(prev);
    } else {
      setCurrentIndex(prev);
    }
  };

  const handleNext = () => {
    const next = Math.min(sentences.current.length - 1, currentIndex + 1);
    window.speechSynthesis?.cancel();
    if (isPlaying) {
      speakFrom(next);
    } else {
      setCurrentIndex(next);
    }
  };

  const handleSentenceClick = (i: number) => {
    window.speechSynthesis?.cancel();
    setCurrentIndex(i);
    currentIndexRef.current = i;
    speakFrom(i);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    if (isPlaying) {
      speakFrom(currentIndex);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(480px, 100vw)',
          background: '#111827',
          color: '#f3f4f6',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔊</span>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>Speechify Reader</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
              color: '#f3f4f6', width: '32px', height: '32px', cursor: 'pointer',
              fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Sentence List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {sentences.current.map((sentence, i) => (
            <div
              key={i}
              ref={el => { sentenceRefs.current[i] = el; }}
              onClick={() => handleSentenceClick(i)}
              className={i === currentIndex ? 'speechify-active' : ''}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.6',
                cursor: 'pointer',
                transition: 'background 0.2s',
                background: i === currentIndex ? 'rgba(250,204,21,0.18)' : 'transparent',
                color: i === currentIndex ? '#fde68a' : i < currentIndex ? 'rgba(243,244,246,0.4)' : '#d1d5db',
                borderLeft: i === currentIndex ? '3px solid #facc15' : '3px solid transparent',
              }}
            >
              {sentence}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
          background: '#0f172a',
        }}>
          {/* Speed Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap', minWidth: '120px' }}>
              Geschwindigkeit: {speed.toFixed(2).replace('.00', '.0').replace(/0$/, '')}x
            </span>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.25}
              value={speed}
              onChange={e => handleSpeedChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#facc15', cursor: 'pointer' }}
            />
          </div>

          {/* Playback buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              title="Zurück"
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
                color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                width: '44px', height: '44px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >⏮</button>

            <button
              onClick={handlePlayPause}
              title={isPlaying ? 'Pause' : 'Abspielen'}
              style={{
                background: '#facc15', border: 'none', borderRadius: '10px',
                color: '#111827',
                width: '56px', height: '44px', cursor: 'pointer',
                fontSize: '20px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex >= sentences.current.length - 1}
              title="Weiter"
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
                color: currentIndex >= sentences.current.length - 1 ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                width: '44px', height: '44px', cursor: currentIndex >= sentences.current.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >⏭</button>
          </div>

          {/* Progress info */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280' }}>
            Satz {currentIndex + 1} von {sentences.current.length}
          </div>
        </div>
      </div>
    </div>
  );
}
