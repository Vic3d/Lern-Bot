'use client';

import Link from 'next/link';

interface Document {
  id: string;
  filename: string;
  chapters_count: number;
  progress: number;
  last_accessed: string;
}

interface DocumentListProps {
  documents: Document[];
}

export default function DocumentList({ documents }: DocumentListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc, idx) => (
        <Link key={doc.id} href={`/reader/${doc.id}`}>
          <div className="group h-full bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl dark:hover:shadow-blue-900/30 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer animate-slide-in" style={{ animationDelay: `${idx * 0.05}s` }}>
            
            {/* Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📖</span>
            </div>

            {/* Title & Chapters */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {doc.filename}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {doc.chapters_count} chapter{doc.chapters_count !== 1 ? 's' : ''}
            </p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {Math.round(doc.progress * 100)}% Complete
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-500"
                  style={{ width: `${doc.progress * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <span>📅 {new Date(doc.last_accessed).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}</span>
              <span>⏱️ ~{Math.ceil(doc.chapters_count * 8)} min</span>
            </div>

            {/* CTA */}
            <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 group-hover:shadow-lg transform group-hover:scale-105 active:scale-95">
              Continue →
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
