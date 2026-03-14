'use client';

import { useState } from 'react';

interface DocumentUploadProps {
  onUpload: (file: File) => void;
  loading: boolean;
}

export default function DocumentUpload({ onUpload, loading }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      onUpload(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragActive ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '48px 32px',
        textAlign: 'center',
        background: dragActive ? 'rgba(232, 184, 0, 0.05)' : 'var(--off-white)',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleChange}
        id="file-input"
        disabled={loading}
        style={{ display: 'none' }}
      />
      
      <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {loading ? '⏳' : '📄'}
        </div>
        <h3 style={{ marginBottom: '8px', fontSize: '20px' }}>
          {loading ? 'Verarbeitung läuft...' : 'PDF hochladen'}
        </h3>
        <p style={{
          color: 'var(--text-muted)',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          {loading
            ? 'Bitte warten...'
            : 'Datei hierher ziehen oder klicken'}
        </p>

        {!loading && (
          <button
            style={{
              background: 'var(--navy)',
              color: 'var(--white)',
              padding: '12px 32px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            PDF wählen
          </button>
        )}
      </label>
    </div>
  );
}
