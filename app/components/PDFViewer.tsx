'use client';

import { useEffect, useRef, useState } from 'react';

interface PDFViewerProps {
  pdfBytes: ArrayBuffer | Uint8Array;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export default function PDFViewer({ pdfBytes, currentPage = 1, onPageChange }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(currentPage);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF.js from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).pdfjsLib) { loadPDF(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      loadPDF();
    };
    script.onerror = () => setError('PDF.js konnte nicht geladen werden');
    document.head.appendChild(script);
  }, []);

  // Reload when bytes change
  useEffect(() => {
    if ((window as any)?.pdfjsLib && pdfBytes) loadPDF();
  }, [pdfBytes]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current) renderPage(page);
  }, [page, scale]);

  // Sync with external currentPage prop
  useEffect(() => {
    if (currentPage !== page) { setPage(currentPage); }
  }, [currentPage]);

  async function loadPDF() {
    try {
      setLoading(true);
      setError(null);
      const pdfjsLib = (window as any).pdfjsLib;
      const copy = pdfBytes.slice(0); // kopieren — pdfjs transferiert den Buffer
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setPage(1);
      await renderPage(1);
    } catch (err: any) {
      setError('PDF konnte nicht geladen werden: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function renderPage(pageNum: number) {
    if (!pdfDocRef.current || !canvasRef.current) return;
    // Cancel previous render
    if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }
    try {
      const pdfPage = await pdfDocRef.current.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      const renderTask = pdfPage.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') console.error('Render error:', err);
    }
  }

  const goTo = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    onPageChange?.(clamped);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#525659', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#3d3f41', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => goTo(page - 1)} disabled={page <= 1} style={toolBtn}>‹</button>
          <span style={{ fontSize: '13px', color: 'white', minWidth: '80px', textAlign: 'center' }}>
            {loading ? '...' : `${page} / ${totalPages}`}
          </span>
          <button onClick={() => goTo(page + 1)} disabled={page >= totalPages} style={toolBtn}>›</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} style={toolBtn}>−</button>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', minWidth: '38px', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} style={toolBtn}>+</button>
          <button onClick={() => setScale(1.2)} style={{ ...toolBtn, fontSize: '11px' }}>Reset</button>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', display: 'flex', justifyContent: 'center', padding: '20px', background: '#525659' }}>
        {error ? (
          <div style={{ color: '#fca5a5', padding: '20px', textAlign: 'center' }}>⚠️ {error}</div>
        ) : loading ? (
          <div style={{ color: 'rgba(255,255,255,0.6)', padding: '40px' }}>Lädt PDF...</div>
        ) : (
          <canvas ref={canvasRef} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.5)', maxWidth: '100%' }} />
        )}
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: 'none',
  borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '16px',
  transition: 'background 0.15s'
};
