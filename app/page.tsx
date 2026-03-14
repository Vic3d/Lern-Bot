'use client';

import { useState, useEffect } from 'react';
import DocumentList from './components/DocumentList';
import DocumentUpload from './components/DocumentUpload';

export default function Home() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setDocuments([...documents, data.document]);
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="mb-16 animate-slide-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-xl">📚</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Smart PDF Reader
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Transform your PDFs into audio learning experiences. Upload, listen, and retain knowledge faster than ever.
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-20 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <DocumentUpload onUpload={handleUpload} loading={loading} />
        </div>

        {/* Documents Section */}
        <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Your Documents
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {documents.length === 0 
                ? 'Upload your first PDF to get started with audio learning' 
                : `${documents.length} document${documents.length !== 1 ? 's' : ''} ready to learn`}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-flex gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-4">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                No documents yet. Start by uploading a PDF!
              </p>
            </div>
          ) : (
            <DocumentList documents={documents} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-20 pt-12 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Features</h3>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>✨ AI-powered text extraction</li>
                <li>🎵 Neural voice audio</li>
                <li>📊 Progress tracking</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Learning</h3>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>🧠 Cognitive load aware</li>
                <li>📈 Adaptive difficulty</li>
                <li>🔄 Spaced repetition</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Access</h3>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>🌐 Cloud or offline</li>
                <li>📱 Mobile responsive</li>
                <li>🔒 Your data, always</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
