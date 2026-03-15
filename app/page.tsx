'use client';

import { useState, useEffect } from 'react';
import DocumentList from './components/DocumentList';
import DocumentUpload from './components/DocumentUpload';
import AuthButton from './components/AuthButton';
import { extractPDF, ExtractProgress } from '@/lib/pdfExtract';
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
  const [uploadProgress, setUploadProgress] = useState<ExtractProgress | null>(null);

  useEffect(() => {
    setDocuments(getDocumentsFromStorage());
  }, []);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setUploadError(null);
    setUploadProgress(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { document, chapters } = await extractPDF(file, (progress) => {
        setUploadProgress(progress);
      });
      await savePDF(document.id, arrayBuffer);
      saveDocumentToStorage(document, chapters);
      setDocuments(getDocumentsFromStorage());
    } catch (error: any) {
      setUploadError(`Fehler beim Lesen der PDF: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = (docId: string) => {
    deleteDocumentFromStorage(docId);
    deletePDF(docId).catch(() => {});
    setDocuments(getDocumentsFromStorage());
  };

  const progressLabel = (() => {
    if (!uploadProgress) return 'Verarbeitung läuft...';
    if (uploadProgress.stage === 'reading') {
      return `Seite ${uploadProgress.pagesProcessed} / ${uploadProgress.pagesTotal} wird gelesen...`;
    }
    if (uploadProgress.stage === 'processing') {
      return 'Kapitel werden erkannt...';
    }
    return 'Fertig!';
  })();

  const progressPercent = uploadProgress
    ? uploadProgress.stage === 'processing' || uploadProgress.stage === 'done'
      ? 100
      : Math.round((uploadProgress.pagesProcessed / Math.max(uploadProgress.pagesTotal, 1)) * 100)
    : 0;

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
            LearnFlow
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <AuthButton />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>v1.0.0</span>
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

        {/* Loading Progress */}
        {loading && (
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <span className="spinner spinner-dark" style={{
                borderColor: 'rgba(27,58,140,0.2)',
                borderTopColor: 'var(--navy)',
              }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>
                PDF wird analysiert...
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {progressLabel}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{
              height: '6px',
              background: '#dbeafe',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'var(--navy)',
                borderRadius: '3px',
                width: loading && !uploadProgress ? '15%' : `${progressPercent}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

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
