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
    <div className="grid grid-cols-1 gap-4">
      {documents.map((doc) => (
        <Link key={doc.id} href={`/reader/${doc.id}`}>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md dark:hover:shadow-slate-900 transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  📕 {doc.filename}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {doc.chapters_count} chapters
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {Math.round(doc.progress * 100)}% complete
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${doc.progress * 100}%` }}
                ></div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-500">
              Last read: {new Date(doc.last_accessed).toLocaleDateString()}
            </p>

            <div className="mt-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm">
                Continue →
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
