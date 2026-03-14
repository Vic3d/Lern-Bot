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
      className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
        dragActive
          ? 'border-blue-500 bg-blue-950/30'
          : 'border-slate-700 hover:border-slate-600'
      } ${loading ? 'opacity-50' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
        id="file-input"
        disabled={loading}
      />
      
      <label htmlFor="file-input" className="cursor-pointer">
        <div className="text-5xl mb-4">{loading ? '⏳' : '📄'}</div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {loading ? 'Verarbeitung läuft...' : 'PDF hochladen'}
        </h3>
        <p className="text-slate-400 text-sm">
          {loading ? 'Bitte warten...' : 'Datei hierher ziehen oder klicken'}
        </p>
      </label>
    </div>
  );
}
