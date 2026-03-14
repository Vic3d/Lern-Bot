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
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
      <audio
        ref={audioRef}
        src={`/api/chapters/${chapter.id}/audio`}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Title */}
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
        🎵 {chapter.title}
      </h2>

      {/* Main Controls */}
      <div className="space-y-8">
        
        {/* Play/Pause + Skip */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => skip(-15)}
            className="p-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95"
            title="Rewind 15s"
          >
            <span className="text-2xl">⏮️</span>
          </button>

          <button
            onClick={togglePlay}
            className="p-6 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <span className="text-4xl">⏸</span> : <span className="text-4xl">▶️</span>}
          </button>

          <button
            onClick={() => skip(15)}
            className="p-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95"
            title="Forward 15s"
          >
            <span className="text-2xl">⏭️</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-full cursor-pointer accent-blue-600 hover:accent-blue-500"
          />
          <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">Speed:</span>
          {[0.75, 1.0, 1.25, 1.5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                speed === s
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-500 font-medium">
          ✓ Auto-saving • Currently at {formatTime(currentTime)}
        </div>
      </div>
    </div>
  );
}
