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
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onUpload(file);
      } else {
        alert('Please upload a PDF file');
      }
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
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="text-5xl mb-3">📁</div>
        <h3 className="text-xl font-semibold mb-2">
          {loading ? 'Processing...' : 'Upload Your PDF'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Drag and drop your PDF here, or click to browse
        </p>
        {!loading && (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            Choose PDF
          </button>
        )}
      </label>
    </div>
  );
}
