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
    <main style={{ minHeight: '100vh', background: 'var(--white)' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'var(--navy)',
        zIndex: 1000,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              width: '40px',
              height: '40px',
              background: 'var(--gold)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>📚</span>
            Smart PDF Reader
          </div>
          <div style={{ fontSize: '24px' }}>👤</div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '120px 2rem 4rem',
      }}>
        
        {/* Hero */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ marginBottom: '12px' }}>Deine PDFs vorlesen lassen</h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            maxWidth: '600px'
          }}>
            Lade ein PDF hoch und folge dem Audio. Intelligent extrahierte Inhalte, professionelle Sprachausgabe.
          </p>
        </div>

        {/* Upload */}
        <div style={{ marginBottom: '4rem' }}>
          <DocumentUpload onUpload={handleUpload} loading={loading} />
        </div>

        {/* Documents */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Dateien werden geladen...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            border: `2px dashed var(--border)`,
            borderRadius: '12px'
          }}>
            <p style={{ color: 'var(--text-muted)' }}>Noch keine PDFs hochgeladen</p>
          </div>
        ) : (
          <DocumentList documents={documents} />
        )}
      </div>
    </main>
  );
}
