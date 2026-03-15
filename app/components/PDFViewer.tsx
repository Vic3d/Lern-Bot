'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PDFViewerProps {
  pdfBytes: Uint8Array;
  chapterText?: string;
  highlightCharIndex?: number;
  onTextClick?: (charIndex: number) => void;
}

interface WordEntry {
  word: string;
  charStart: number;
  charEnd: number;
}

function buildWordList(text: string): WordEntry[] {
  const list: WordEntry[] = [];
  const regex = /\S+/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    list.push({ word: m[0].toLowerCase().replace(/[^a-z0-9äöüß]/g, ''), charStart: m.index, charEnd: m.index + m[0].length });
  }
  return list.filter(w => w.word.length > 0);
}

export default function PDFViewer({ pdfBytes, chapterText = '', highlightCharIndex = -1, onTextClick }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  // Word matching state
  const spanWordMapRef = useRef<{ el: HTMLElement; word: string; idx: number }[]>([]);
  const wordListRef = useRef<WordEntry[]>([]);
  const matchCursorRef = useRef(0);
  const highlightedElRef = useRef<HTMLElement | null>(null);

  // Load PDF.js CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      initPDF();
    };
    if ((window as any).pdfjsLib) { load(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = load;
    s.onerror = () => setError('PDF.js konnte nicht geladen werden');
    document.head.appendChild(s);
  }, []);

  async function initPDF() {
    try {
      setLoading(true);
      setError(null);
      const pdfjsLib = (window as any).pdfjsLib;
      const data = new Uint8Array(pdfBytes); // fresh copy
      const doc = await pdfjsLib.getDocument({ data }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      wordListRef.current = buildWordList(chapterText);
    } catch (e: any) {
      setError('PDF konnte nicht geladen werden: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // Re-init when bytes change
  useEffect(() => {
    if ((window as any)?.pdfjsLib && pdfBytes) initPDF();
  }, [pdfBytes]);

  // Re-init word list when chapter changes
  useEffect(() => {
    wordListRef.current = buildWordList(chapterText);
    matchCursorRef.current = 0;
    spanWordMapRef.current = [];
    clearHighlight();
  }, [chapterText]);

  // Render all pages when pdfDoc or scale changes
  useEffect(() => {
    if (!pdfDoc) return;
    spanWordMapRef.current = [];
    matchCursorRef.current = 0;
    setRenderedPages(new Set());
    renderAllPages();
  }, [pdfDoc, scale]);

  async function renderAllPages() {
    if (!pdfDoc || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    spanWordMapRef.current = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Page wrapper
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `position:relative; margin:0 auto 12px; width:${viewport.width}px; height:${viewport.height}px; background:white; box-shadow:0 2px 12px rgba(0,0,0,0.3); border-radius:2px;`;
      wrapper.dataset.page = String(pageNum);

      // Canvas for PDF rendering
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = 'position:absolute; top:0; left:0; display:block;';
      wrapper.appendChild(canvas);

      // Text layer div
      const textLayerDiv = document.createElement('div');
      textLayerDiv.style.cssText = `position:absolute; top:0; left:0; width:${viewport.width}px; height:${viewport.height}px; overflow:hidden; line-height:1; pointer-events:auto; user-select:none; cursor:text;`;
      textLayerDiv.className = 'pdf-text-layer';
      wrapper.appendChild(textLayerDiv);

      container.appendChild(wrapper);

      // Render PDF page to canvas
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Render text layer
      const textContent = await page.getTextContent();
      const pdfjsLib = (window as any).pdfjsLib;

      // Inject text layer CSS once
      if (!document.getElementById('pdf-tl-style')) {
        const style = document.createElement('style');
        style.id = 'pdf-tl-style';
        style.textContent = `
          .pdf-text-layer span {
            position: absolute;
            white-space: pre;
            transform-origin: 0% 0%;
            cursor: text;
            color: transparent;
            transition: background 0.15s;
            border-radius: 2px;
          }
          .pdf-text-layer span:hover { background: rgba(59,130,246,0.1); }
          .pdf-word-highlight {
            background: rgba(251,191,36,0.5) !important;
            box-shadow: 0 0 0 1px rgba(251,191,36,0.8);
            border-radius: 2px;
          }
        `;
        document.head.appendChild(style);
      }

      const textDivs: HTMLElement[] = [];
      await pdfjsLib.renderTextLayer({
        textContent,
        container: textLayerDiv,
        viewport,
        textDivs,
      }).promise;

      // Map text spans to words in chapterText
      let spanIdx = spanWordMapRef.current.length;
      for (const div of textDivs) {
        const raw = div.textContent || '';
        const words = raw.match(/\S+/g) || [];
        for (const w of words) {
          const clean = w.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
          if (clean.length > 0) {
            spanWordMapRef.current.push({ el: div, word: clean, idx: spanIdx++ });
          }
        }
        // Click handler
        div.addEventListener('click', (e) => handleTextClick(e, div, textContent, textDivs));
      }

      setRenderedPages(prev => new Set([...prev, pageNum]));
    }
  }

  function handleTextClick(e: MouseEvent, div: HTMLElement, textContent: any, textDivs: HTMLElement[]) {
    if (!onTextClick) return;
    // Find which word in our word map this span corresponds to
    const spanEntry = spanWordMapRef.current.find(s => s.el === div);
    if (!spanEntry) return;

    // Find matching word in chapterText word list
    const wordList = wordListRef.current;
    // Search around the current span's position in the word map
    const spanMapIdx = spanWordMapRef.current.indexOf(spanEntry);
    // Find the closest chapterText word match
    const ratio = wordList.length > 0 ? spanMapIdx / Math.max(1, spanWordMapRef.current.length) : 0;
    const approxWordIdx = Math.floor(ratio * wordList.length);
    const charIndex = wordList[approxWordIdx]?.charStart ?? 0;
    onTextClick(charIndex);
    matchCursorRef.current = approxWordIdx;
  }

  function clearHighlight() {
    if (highlightedElRef.current) {
      highlightedElRef.current.classList.remove('pdf-word-highlight');
      highlightedElRef.current = null;
    }
  }

  // Highlight + scroll when TTS position changes
  useEffect(() => {
    if (highlightCharIndex < 0 || wordListRef.current.length === 0 || spanWordMapRef.current.length === 0) {
      clearHighlight();
      return;
    }

    // Find word in chapterText that contains highlightCharIndex
    const words = wordListRef.current;
    let wordIdx = words.findIndex(w => w.charStart <= highlightCharIndex && highlightCharIndex < w.charEnd);
    if (wordIdx < 0) {
      // find closest
      wordIdx = words.findIndex(w => w.charStart >= highlightCharIndex);
      if (wordIdx < 0) wordIdx = words.length - 1;
    }

    // Map word index to span: use ratio
    const ratio = wordIdx / Math.max(1, words.length - 1);
    const spanIdx = Math.floor(ratio * (spanWordMapRef.current.length - 1));
    const span = spanWordMapRef.current[spanIdx];
    if (!span) return;

    clearHighlight();
    span.el.classList.add('pdf-word-highlight');
    highlightedElRef.current = span.el;

    // Auto-scroll
    span.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightCharIndex]);

  const scrollToTop = () => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#525659', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#3d3f41', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={scrollToTop} style={tb}>↑ Top</button>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{totalPages} Seiten</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} style={tb}>−</button>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', minWidth: '36px', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} style={tb}>+</button>
          <button onClick={() => setScale(1.3)} style={{ ...tb, fontSize: '10px' }}>Reset</button>
        </div>
      </div>

      {/* Scroll container */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '20px', background: '#525659', position: 'relative' }}>
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '60px 20px' }}>
            ⏳ PDF wird geladen...
          </div>
        )}
        {error && (
          <div style={{ color: '#fca5a5', textAlign: 'center', padding: '40px 20px' }}>⚠️ {error}</div>
        )}
        {/* Pages are imperatively injected here by renderAllPages() */}
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} />
      </div>
    </div>
  );
}

const tb: React.CSSProperties = {
  padding: '3px 9px', background: 'rgba(255,255,255,0.1)', border: 'none',
  borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '13px',
};
