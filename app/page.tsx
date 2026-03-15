'use client';

import { useState, useEffect } from 'react';
import DocumentList from './components/DocumentList';
import DocumentUpload from './components/DocumentUpload';
import { extractPDF } from '@/lib/pdfExtract';
import { savePDF, deletePDF } from '@/lib/pdfStorage';

const STORAGE_KEY = 'lernbot_documents';
const CHAPTERS_KEY_PREFIX = 'lernbot_chapters_';

function saveDocumentToStorage(document: any, chapters: any[]) {
  if (typeof window === 'undefined') return;
  const docs = getDocumentsFromStorage();
  const existing = docs.findIndex((d: any) => d.id === document.id);
  if (existing >= 0) {
    docs[existing] = document;
  } else {
    docs.push(document);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  localStorage.setItem(`${CHAPTERS_KEY_PREFIX}${document.id}`, JSON.stringify(chapters));
}

function getDocumentsFromStorage(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function deleteDocumentFromStorage(docId: string) {
  if (typeof window === 'undefined') return;
  const docs = getDocumentsFromStorage().filter((d: any) => d.id !== docId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  localStorage.removeItem(`${CHAPTERS_KEY_PREFIX}${docId}`);
}

export default function Home() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    // Aus localStorage laden
    setDocuments(getDocumentsFromStorage());
  }, []);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setUploadError(null);

    try {
      // Client-seitige Extraktion — kein Server nötig, funktioniert auf Vercel
      // PDF-Bytes für Viewer in IndexedDB speichern
      const arrayBuffer = await file.arrayBuffer();
      const { document, chapters } = await extractPDF(file);
      await savePDF(document.id, arrayBuffer);
      saveDocumentToStorage(document, chapters);
      setDocuments(getDocumentsFromStorage());
    } catch (error: any) {
      setUploadError(`Fehler beim Lesen der PDF: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (docId: string) => {
    deleteDocumentFromStorage(docId);
    deletePDF(docId).catch(() => {});
    setDocuments(getDocumentsFromStorage());
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>v0.8.0</span>
          </div>
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
          <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px' }}>
            Lade ein PDF hoch — Text wird automatisch extrahiert und vorgelesen. Daten bleiben lokal in deinem Browser.
          </p>
        </div>

        {/* Upload */}
        <div style={{ marginBottom: '2rem' }}>
          <DocumentUpload onUpload={handleUpload} loading={loading} />
        </div>

        {/* Error */}
        {uploadError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '2rem',
            fontSize: '14px'
          }}>
            ⚠️ {uploadError}
          </div>
        )}

        {/* Dokumente */}
        {documents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            border: `2px dashed var(--border)`,
            borderRadius: '12px'
          }}>
            <p style={{ color: 'var(--text-muted)' }}>Noch keine PDFs hochgeladen</p>
          </div>
        ) : (
          <DocumentList documents={documents} onDelete={handleDelete} />
        )}
      </div>
    </main>
  );
}
