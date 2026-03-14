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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, currentTime + seconds);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'var(--off-white)',
      borderRadius: '12px',
      padding: '32px',
      border: `1px solid var(--border)`
    }}>
      <audio
        ref={audioRef}
        src={`/api/chapters/${chapter.id}/audio`}
        onEnded={() => setIsPlaying(false)}
      />

      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        marginBottom: '32px',
        color: 'var(--text)'
      }}>
        🎵 {chapter.title}
      </h2>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Play Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <button
            onClick={() => skip(-15)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              background: 'var(--border)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--lightblue)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
          >
            ⏮
          </button>

          <button
            onClick={togglePlay}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              background: 'var(--navy)',
              color: 'var(--white)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '28px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#122870'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--navy)'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => skip(15)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              background: 'var(--border)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--lightblue)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
          >
            ⏭
          </button>
        </div>

        {/* Progress */}
        <div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '8px' }}>Speed:</span>
          {[0.75, 1.0, 1.25, 1.5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                background: speed === s ? 'var(--navy)' : 'var(--border)',
                color: speed === s ? 'var(--white)' : 'var(--text)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (speed !== s) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--lightblue)';
                }
              }}
              onMouseLeave={(e) => {
                if (speed !== s) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--border)';
                }
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
