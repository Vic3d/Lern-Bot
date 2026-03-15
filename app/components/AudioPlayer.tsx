'use client';

import { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
  chapter: any;
  documentId: string;
}

export default function AudioPlayer({ chapter, documentId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);

  // TTS state
  const [ttsMode, setTtsMode] = useState(false); // true = using Web Speech API
  const [ttsPaused, setTtsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsProgressRef = useRef(0);
  const ttsStartTimeRef = useRef(0);
  const ttsDurationRef = useRef(chapter.duration_seconds || 120);

  const hasAudio = chapter.audio_path !== null && chapter.audio_path !== undefined;
  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Reset on chapter change
  useEffect(() => {
    stopTTS();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    ttsProgressRef.current = 0;
    ttsDurationRef.current = chapter.duration_seconds || 120;
  }, [chapter.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  // Real audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || ttsMode) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [ttsMode]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    if (utteranceRef.current) utteranceRef.current.rate = speed;
  }, [speed]);

  // ---- TTS helpers ----
  function stopTTS() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (ttsIntervalRef.current) {
      clearInterval(ttsIntervalRef.current);
      ttsIntervalRef.current = null;
    }
    utteranceRef.current = null;
  }

  function startTTS(resumeFrom = 0) {
    stopTTS();
    if (!hasTTS) return;

    const text = chapter.cleaned_text || '';
    // Resume: approximate position by char offset
    const totalChars = text.length;
    const startChar = resumeFrom > 0 ? Math.floor((resumeFrom / ttsDurationRef.current) * totalChars) : 0;
    const speakText = text.substring(startChar);

    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.lang = 'de-DE';
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a German voice
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(v => v.lang.startsWith('de')) || null;
    if (germanVoice) utterance.voice = germanVoice;

    utteranceRef.current = utterance;

    utterance.onend = () => {
      setIsPlaying(false);
      setTtsPaused(false);
      ttsProgressRef.current = ttsDurationRef.current;
      setCurrentTime(ttsDurationRef.current);
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('TTS error:', e.error);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
    ttsStartTimeRef.current = Date.now() - resumeFrom * 1000;

    // Progress ticker
    ttsIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - ttsStartTimeRef.current) / 1000;
      const pos = Math.min(elapsed * speed, ttsDurationRef.current);
      ttsProgressRef.current = pos;
      setCurrentTime(pos);
      setDuration(ttsDurationRef.current);
    }, 500);
  }

  // ---- Controls ----
  const togglePlay = () => {
    if (hasAudio && audioRef.current) {
      // Real audio
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
      return;
    }

    // TTS fallback
    if (!hasTTS) return;

    if (!ttsMode) setTtsMode(true);

    if (isPlaying && !ttsPaused) {
      // Pause
      window.speechSynthesis.pause();
      setTtsPaused(true);
      setIsPlaying(false);
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
    } else if (ttsPaused) {
      // Resume
      window.speechSynthesis.resume();
      setTtsPaused(false);
      setIsPlaying(true);
      ttsStartTimeRef.current = Date.now() - ttsProgressRef.current * 1000;
      ttsIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - ttsStartTimeRef.current) / 1000;
        const pos = Math.min(elapsed * speed, ttsDurationRef.current);
        ttsProgressRef.current = pos;
        setCurrentTime(pos);
        setDuration(ttsDurationRef.current);
      }, 500);
    } else {
      // Start fresh or from progress
      startTTS(ttsProgressRef.current);
      setIsPlaying(true);
      setTtsPaused(false);
    }
  };

  const skip = (seconds: number) => {
    if (hasAudio && audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
      return;
    }
    // TTS: restart from new position
    const newPos = Math.max(0, Math.min(ttsProgressRef.current + seconds, ttsDurationRef.current));
    ttsProgressRef.current = newPos;
    setCurrentTime(newPos);
    if (isPlaying) {
      startTTS(newPos);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (hasAudio && audioRef.current) {
      audioRef.current.currentTime = newTime;
      return;
    }
    ttsProgressRef.current = newTime;
    setCurrentTime(newTime);
    if (isPlaying) {
      startTTS(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayDuration = hasAudio ? duration : (ttsDurationRef.current || chapter.duration_seconds || 0);

  return (
    <div style={{
      background: 'var(--off-white)',
      borderRadius: '12px',
      padding: '32px',
      border: `1px solid var(--border)`
    }}>
      {/* Hidden real audio element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={`/api/chapters/${chapter.id}/audio`}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: 'var(--text)' }}>
        🎵 {chapter.title}
      </h2>

      {/* TTS info banner */}
      {!hasAudio && hasTTS && (
        <div style={{
          background: '#e0f2fe',
          border: '1px solid #0284c7',
          color: '#0369a1',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔊 <span><strong>Browser-Sprachausgabe aktiv</strong> — Drücke Play zum Anhören (Deutsch)</span>
        </div>
      )}

      {!hasAudio && !hasTTS && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          color: '#b45309',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          ⚠️ Dein Browser unterstützt keine Sprachausgabe. Bitte lies den Transcript unten.
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Play Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button
            onClick={() => skip(-15)}
            title="15 Sekunden zurück"
            style={{
              width: '44px', height: '44px', borderRadius: '8px',
              background: 'var(--border)', border: 'none', cursor: 'pointer',
              fontSize: '18px', transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--lightblue)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
          >
            ⏮
          </button>

          <button
            onClick={togglePlay}
            disabled={!hasAudio && !hasTTS}
            style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: (!hasAudio && !hasTTS) ? 'var(--border)' : 'var(--navy)',
              color: 'var(--white)', border: 'none',
              cursor: (!hasAudio && !hasTTS) ? 'not-allowed' : 'pointer',
              fontSize: '28px', transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={(e) => { if (hasAudio || hasTTS) (e.currentTarget as HTMLElement).style.background = '#122870'; }}
            onMouseLeave={(e) => { if (hasAudio || hasTTS) (e.currentTarget as HTMLElement).style.background = 'var(--navy)'; }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => skip(15)}
            title="15 Sekunden vor"
            style={{
              width: '44px', height: '44px', borderRadius: '8px',
              background: 'var(--border)', border: 'none', cursor: 'pointer',
              fontSize: '18px', transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--lightblue)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
          >
            ⏭
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <input
            type="range"
            min="0"
            max={displayDuration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            style={{ width: '100%', marginBottom: '8px', accentColor: 'var(--navy)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>

        {/* Speed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '8px' }}>Speed:</span>
          {[0.75, 1.0, 1.25, 1.5].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s);
                if (utteranceRef.current) utteranceRef.current.rate = s;
                // Restart TTS at current position with new speed if playing
                if (isPlaying && !hasAudio) {
                  startTTS(ttsProgressRef.current);
                }
              }}
              style={{
                padding: '8px 12px', borderRadius: '6px', border: 'none',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                background: speed === s ? 'var(--navy)' : 'var(--border)',
                color: speed === s ? 'var(--white)' : 'var(--text)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (speed !== s) (e.currentTarget as HTMLElement).style.background = 'var(--lightblue)'; }}
              onMouseLeave={(e) => { if (speed !== s) (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
            >
              {s}x
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
