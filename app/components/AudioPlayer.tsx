'use client';

import { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
  chapter: any;
  documentId: string;
  onBoundary?: (charIndex: number) => void;
  onEnded?: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  seekToChar?: { char: number; seq: number } | null; // reaktiv: TTS-Neustart
}

export default function AudioPlayer({ chapter, documentId, onBoundary, onEnded, speed, onSpeedChange, seekToChar }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ttsPaused, setTtsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsProgressRef = useRef(0);
  const ttsStartTimeRef = useRef(0);
  const ttsStartCharRef = useRef(0);
  const ttsResumeFromRef = useRef(0); // base position when TTS started
  const ttsDurationRef = useRef(chapter.duration_seconds || 120);

  const hasAudio = !!chapter.audio_path;
  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    stopTTS();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    ttsProgressRef.current = 0;
    ttsStartCharRef.current = 0;
    ttsDurationRef.current = chapter.duration_seconds || 120;
  }, [chapter.id]);

  useEffect(() => () => { stopTTS(); }, []);

  // seekToChar: reaktiver Seek aus dem PDF-Viewer (Klick auf Wort)
  useEffect(() => {
    if (seekToChar == null) return;
    const { char: charIdx } = seekToChar;
    const text = chapter.cleaned_text || '';
    if (hasAudio && audioRef.current) {
      const dur = audioRef.current.duration || ttsDurationRef.current;
      const ratio = text.length > 0 ? charIdx / text.length : 0;
      audioRef.current.currentTime = ratio * dur;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }
    // TTS: direkt ab Zeichenposition starten
    const dur = ttsDurationRef.current;
    const ratio = text.length > 0 ? charIdx / text.length : 0;
    const timePos = ratio * dur;
    startTTS(timePos);
    setIsPlaying(true);
    setTtsPaused(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToChar]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setCurrentTime(audio.currentTime);
    const meta = () => setDuration(audio.duration);
    const end = () => { setIsPlaying(false); onEnded?.(); };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', meta);
    audio.addEventListener('ended', end);
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('loadedmetadata', meta); audio.removeEventListener('ended', end); };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  function stopTTS() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (ttsIntervalRef.current) { clearInterval(ttsIntervalRef.current); ttsIntervalRef.current = null; }
    utteranceRef.current = null;
  }

  function startTTS(resumeFrom = 0) {
    stopTTS();
    if (!hasTTS) return;
    const fullText = chapter.cleaned_text || '';
    const dur = ttsDurationRef.current;
    const startChar = resumeFrom > 0 ? Math.floor((resumeFrom / dur) * fullText.length) : 0;
    ttsStartCharRef.current = startChar;
    const speakText = fullText.substring(startChar);
    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.lang = 'de-DE';
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(v => v.lang.startsWith('de')) || null;
    if (germanVoice) utterance.voice = germanVoice;
    utteranceRef.current = utterance;
    utterance.onboundary = (event) => { onBoundary?.(startChar + event.charIndex); };
    utterance.onend = () => {
      setIsPlaying(false); setTtsPaused(false);
      ttsProgressRef.current = dur; setCurrentTime(dur);
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      onEnded?.();
    };
    utterance.onerror = (e) => { if (e.error !== 'interrupted') { console.error('TTS:', e.error); setIsPlaying(false); } };
    window.speechSynthesis.speak(utterance);
    ttsResumeFromRef.current = resumeFrom;
    ttsStartTimeRef.current = Date.now();
    ttsIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - ttsStartTimeRef.current) / 1000;
      // resumeFrom + elapsed*speed so position is correct regardless of speed
      const pos = Math.min(ttsResumeFromRef.current + elapsed * speed, dur);
      ttsProgressRef.current = pos; setCurrentTime(pos); setDuration(dur);
    }, 300);
  }

  const togglePlay = () => {
    if (hasAudio && audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying); return;
    }
    if (!hasTTS) return;
    if (isPlaying && !ttsPaused) {
      window.speechSynthesis.pause(); setTtsPaused(true); setIsPlaying(false);
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
    } else if (ttsPaused) {
      window.speechSynthesis.resume(); setTtsPaused(false); setIsPlaying(true);
      ttsResumeFromRef.current = ttsProgressRef.current;
      ttsStartTimeRef.current = Date.now();
      ttsIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - ttsStartTimeRef.current) / 1000;
        const pos = Math.min(ttsResumeFromRef.current + elapsed * speed, ttsDurationRef.current);
        ttsProgressRef.current = pos; setCurrentTime(pos);
      }, 300);
    } else {
      startTTS(ttsProgressRef.current); setIsPlaying(true); setTtsPaused(false);
    }
  };

  const skip = (seconds: number) => {
    if (hasAudio && audioRef.current) { audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds); return; }
    const newPos = Math.max(0, Math.min(ttsProgressRef.current + seconds, ttsDurationRef.current));
    ttsProgressRef.current = newPos; setCurrentTime(newPos);
    if (isPlaying) startTTS(newPos);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (hasAudio && audioRef.current) { audioRef.current.currentTime = t; return; }
    ttsProgressRef.current = t; setCurrentTime(t);
    if (isPlaying) startTTS(t);
  };

  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const displayDuration = hasAudio ? duration : (ttsDurationRef.current || chapter.duration_seconds || 0);

  return (
    <div style={{ background: 'var(--off-white)', borderRadius: '12px', padding: '28px', border: '1px solid var(--border)' }}>
      {hasAudio && <audio ref={audioRef} src={`/api/chapters/${chapter.id}/audio`} onEnded={() => { setIsPlaying(false); onEnded?.(); }} />}

      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text)' }}>🎵 {chapter.title}</h2>

      {!hasAudio && hasTTS && (
        <div style={{ background: '#e0f2fe', border: '1px solid #0284c7', color: '#0369a1', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          🔊 <strong>Browser-Sprachausgabe</strong> — drücke Play
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Play Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <button onClick={() => skip(-15)} style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--border)', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⏮</button>
          <button onClick={togglePlay} disabled={!hasAudio && !hasTTS} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={() => skip(15)} style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--border)', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⏭</button>
        </div>

        {/* Progress */}
        <div>
          <input type="range" min="0" max={displayDuration || 100} value={currentTime} onChange={handleProgressChange} style={{ width: '100%', marginBottom: '6px', accentColor: 'var(--navy)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>{fmt(currentTime)}</span><span>{fmt(displayDuration)}</span>
          </div>
        </div>

        {/* Speed Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>🐢</span>
          <input type="range" min="0" max="7" step="1" value={(() => { const steps=[0.5,0.75,1.0,1.25,1.5,1.75,2.0,2.5]; const idx=steps.indexOf(speed); return idx>=0?idx:2; })()}
            onChange={(e) => { const steps=[0.5,0.75,1.0,1.25,1.5,1.75,2.0,2.5]; const s=steps[parseInt(e.target.value)]; onSpeedChange(s); if (isPlaying && !hasAudio) startTTS(ttsProgressRef.current); }}
            style={{ flex: 1, accentColor: 'var(--gold)' }}
          />
          <span style={{ fontSize: '16px' }}>🐇</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', minWidth: '34px', textAlign: 'right' }}>{speed.toFixed(1)}×</span>
        </div>
      </div>
    </div>
  );
}
