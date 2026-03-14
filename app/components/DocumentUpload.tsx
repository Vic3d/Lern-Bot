'use client';

import { useState } from 'react';

interface DocumentUploadProps {
  onUpload: (file: File) => void;
  loading: boolean;
}

export default function DocumentUpload({ onUpload, loading }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
        dragActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-105'
          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white/50 dark:bg-slate-800/50'
      } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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
      
      <label htmlFor="file-input" className="cursor-pointer block">
        <div className="mb-6">
          {!loading ? (
            <div className="text-6xl animate-bounce">📄</div>
          ) : (
            <div className="text-6xl">⏳</div>
          )}
        </div>

        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {loading ? 'Processing your PDF...' : 'Upload Your PDF'}
        </h3>

        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-xl mx-auto">
          {loading
            ? 'Extracting text and generating audio. This may take a moment.'
            : 'Drag and drop your PDF here, or click to browse. We support up to 100MB files.'}
        </p>

        {!loading && (
          <button
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <span>📁</span>
            Choose PDF
          </button>
        )}

        {loading && (
          <div className="mt-6">
            <div className="w-full max-w-md mx-auto h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">{uploadProgress}%</p>
          </div>
        )}
      </label>
    </div>
  );
}
