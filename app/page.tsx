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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <div className="w-32 bg-slate-900 border-r border-slate-800 p-4 fixed h-screen">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-3 font-semibold text-sm flex items-center justify-center gap-2 mb-8">
          <span>+</span> Neu
        </button>

        <nav className="space-y-2">
          <div className="px-3 py-2.5 hover:bg-slate-800 rounded cursor-pointer text-sm font-medium text-slate-300 hover:text-white transition">
            📁 Dateien
          </div>
          <div className="px-3 py-2.5 hover:bg-slate-800 rounded cursor-pointer text-sm text-slate-400 hover:text-slate-200 transition">
            🎧 Podcasts
          </div>
          <div className="px-3 py-2.5 hover:bg-slate-800 rounded cursor-pointer text-sm text-slate-400 hover:text-slate-200 transition">
            📝 Notizen
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-32 p-8">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-bold text-white">Meine Dateien</h1>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition">🔍</button>
            <div className="w-10 h-10 bg-orange-500 rounded-full"></div>
          </div>
        </div>

        {/* Upload Section */}
        {documents.length === 0 && !loading && (
          <div className="mb-16">
            <DocumentUpload onUpload={handleUpload} loading={loading} />
          </div>
        )}

        {/* Documents Grid */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-400">Dateien werden geladen...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-6">Noch keine PDFs hochgeladen</p>
            <button 
              onClick={() => document.getElementById('file-input')?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              PDF hochladen
            </button>
            <input type="file" id="file-input" className="hidden" accept=".pdf" />
          </div>
        ) : (
          <DocumentList documents={documents} />
        )}
      </div>
    </div>
  );
}
