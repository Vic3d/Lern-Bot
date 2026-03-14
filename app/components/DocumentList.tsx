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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {documents.map((doc) => (
        <Link key={doc.id} href={`/reader/${doc.id}`}>
          <div className="group cursor-pointer">
            {/* PDF Card */}
            <div className="bg-white rounded-lg overflow-hidden mb-3 h-40 flex items-center justify-center border border-slate-200 group-hover:border-slate-300 transition">
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                <span className="text-4xl opacity-50">📄</span>
              </div>
            </div>

            {/* Info */}
            <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition">
              {doc.filename}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {Math.round(doc.progress * 100)}% • {doc.chapters_count} Kapitel
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {new Date(doc.last_accessed).toLocaleDateString('de-DE')}
            </p>

            {/* Progress Bar */}
            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${doc.progress * 100}%` }}
              ></div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
