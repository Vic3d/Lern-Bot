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
  const [showChapterMenu, setShowChapterMenu] = useState(false);

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
      setShowChapterMenu(false);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setChapter(chapters[currentChapterIndex - 1]);
      setShowChapterMenu(false);
    }
  };

  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setChapter(chapters[index]);
    setShowChapterMenu(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <p className="text-slate-600 dark:text-slate-400">Loading your document...</p>
        </div>
      </main>
    );
  }

  if (!chapter) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-4">
        <Link href="/">
          <button className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2">
            ← Back to Documents
          </button>
        </Link>
        <p className="text-slate-600 dark:text-slate-400">No chapters available</p>
      </main>
    );
  }

  const progress = ((currentChapterIndex + 1) / chapters.length) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-2 transition-colors">
                ← Back
              </button>
            </Link>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            {chapter.title}
          </h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Player + Transcript (3 cols) */}
          <div className="lg:col-span-3 space-y-8">
            <AudioPlayer chapter={chapter} documentId={params.id} />
            <Transcript text={chapter.cleaned_text} />
          </div>

          {/* Chapter Navigation (1 col) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📖</span> Chapters
              </h3>

              {/* Chapter List */}
              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {chapters.map((ch, index) => (
                  <button
                    key={ch.id}
                    onClick={() => goToChapter(index)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      index === currentChapterIndex
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="text-sm opacity-75">{index + 1}</div>
                    <div className="truncate">{ch.title}</div>
                  </button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handlePrevChapter}
                  disabled={currentChapterIndex === 0}
                  className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← Previous
                </button>
                <button
                  onClick={handleNextChapter}
                  disabled={currentChapterIndex === chapters.length - 1}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
