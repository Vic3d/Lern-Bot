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
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📚 Smart PDF Reader</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Learn by listening. Upload PDFs and listen to intelligently extracted content.
          </p>
        </div>

        <DocumentUpload onUpload={handleUpload} loading={loading} />

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">My Documents</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">
                No documents yet. Upload your first PDF to get started!
              </p>
            </div>
          ) : (
            <DocumentList documents={documents} />
          )}
        </div>
      </div>
    </main>
  );
}
