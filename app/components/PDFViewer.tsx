'use client';

import { useEffect, useRef, useState } from 'react';

interface PDFViewerProps {
  pdfBytes: Uint8Array;
  chapterText?: string;
  highlightCharIndex?: number;
  onSeekToChar?: (charIndex: number) => void;
}

interface TextItem {
  str: string;
  globalStart: number;
  globalEnd: number;
  pageNum: number;
  itemIndex: number; // index in page's tc.items array
  spanEl?: HTMLSpanElement;
}

function findChapterStart(fullText: string, chapterText: string): number {
  if (!chapterText || !fullText) return 0;

  const lengths = [150, 80, 40];
  for (const len of lengths) {
    const needle = chapterText.substring(0, len);

    // Direct match
    const direct = fullText.indexOf(needle);
    if (direct >= 0) return direct;

    // Normalized whitespace match
    const normFull = fullText.replace(/\s+/g, ' ');
    const normNeedle = needle.replace(/\s+/g, ' ');
    const normIdx = normFull.indexOf(normNeedle);
    if (normIdx >= 0) return normIdx;
  }
  return 0;
}

export default function PDFViewer({
  pdfBytes,
  chapterText = '',
  highlightCharIndex = -1,
  onSeekToChar,
}: PDFViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF internals
  const pdfDocRef = useRef<any>(null);
  const cachedPagesRef = useRef<any[]>([]);
  const cachedTextContentsRef = useRef<any[]>([]);
  const textItemsRef = useRef<TextItem[]>([]);
  const fullPdfTextRef = useRef('');

  // Chapter position cache
  const chapterStartRef = useRef(-1);
  const chapterTextCacheRef = useRef('');

  // Highlight tracking
  const highlightedSpanRef = useRef<HTMLSpanElement | null>(null);

  // Observers
  const lazyObserverRef = useRef<IntersectionObserver | null>(null);
  const pageObserverRef = useRef<IntersectionObserver | null>(null);
  const renderedPagesRef = useRef(new Set<number>());

  // Always-fresh refs for closures
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const chapterTextRef = useRef(chapterText);
  chapterTextRef.current = chapterText;

  const onSeekToCharRef = useRef(onSeekToChar);
  onSeekToCharRef.current = onSeekToChar;

  // ── Load PDF.js from CDN once ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const init = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      initPDF();
    };
    if ((window as any).pdfjsLib) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = init;
    s.onerror = () => setError('PDF.js konnte nicht geladen werden');
    document.head.appendChild(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when pdfBytes change
  useEffect(() => {
    if ((window as any)?.pdfjsLib && pdfBytes?.length) initPDF();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBytes]);

  // Rebuild layout on scale change (text map stays)
  useEffect(() => {
    if (pdfDocRef.current && cachedPagesRef.current.length) {
      rebuildLayout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Reset chapter cache when chapterText changes
  useEffect(() => {
    chapterStartRef.current = -1;
    chapterTextCacheRef.current = '';
  }, [chapterText]);

  // ── Highlight logic ────────────────────────────────────────────────────────
  useEffect(() => {
    clearHighlight();
    if (highlightCharIndex < 0 || !chapterText) return;

    const chStart = getChapterStart();
    const pdfOffset = chStart + highlightCharIndex;
    const items = textItemsRef.current;
    if (!items.length) return;

    // Binary search for the item containing pdfOffset
    let lo = 0, hi = items.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (items[mid].globalEnd <= pdfOffset) lo = mid + 1;
      else if (items[mid].globalStart > pdfOffset) hi = mid - 1;
      else { found = mid; break; }
    }
    if (found < 0) found = Math.min(lo, items.length - 1);

    const item = items[found];
    if (item?.spanEl) {
      item.spanEl.classList.add('pdf-hl');
      highlightedSpanRef.current = item.spanEl;
      item.spanEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightCharIndex, chapterText]);

  // Cleanup observers on unmount
  useEffect(() => {
    return () => {
      lazyObserverRef.current?.disconnect();
      pageObserverRef.current?.disconnect();
    };
  }, []);

  // ── PDF init ───────────────────────────────────────────────────────────────
  async function initPDF() {
    try {
      setLoading(true);
      setError(null);
      const pdfjsLib = (window as any).pdfjsLib;
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);
      await loadAllTextContent(doc);
      rebuildLayout();
    } catch (e: any) {
      setError('PDF Ladefehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllTextContent(doc: any) {
    const pages: any[] = [];
    const textContents: any[] = [];
    const textItems: TextItem[] = [];
    let offset = 0;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      pages.push(page);
      textContents.push(tc);

      for (let i = 0; i < tc.items.length; i++) {
        const raw = tc.items[i] as any;
        if (!raw.str) continue;
        // Add trailing space unless item already ends with space
        // This makes fullPdfText match cleaned_text spacing
        const str = raw.str;
        const trailingSpace = str.endsWith(' ') ? '' : ' ';
        textItems.push({
          str,
          globalStart: offset,
          globalEnd: offset + str.length,
          pageNum: p,
          itemIndex: i,
        });
        offset += str.length + trailingSpace.length;
      }
    }

    cachedPagesRef.current = pages;
    cachedTextContentsRef.current = textContents;
    textItemsRef.current = textItems;
    fullPdfTextRef.current = textItems.map(i => i.str).join('');
    chapterStartRef.current = -1;
    chapterTextCacheRef.current = '';
  }

  // ── Layout builder ─────────────────────────────────────────────────────────
  function rebuildLayout() {
    const container = containerRef.current;
    if (!container || !cachedPagesRef.current.length) return;

    lazyObserverRef.current?.disconnect();
    pageObserverRef.current?.disconnect();
    renderedPagesRef.current.clear();
    clearHighlight();

    // Clear all spanEl refs (they'll be re-linked when pages render)
    for (const item of textItemsRef.current) item.spanEl = undefined;

    container.innerHTML = '';
    injectCSS();

    const currentScale = scaleRef.current;
    const numPages = cachedPagesRef.current.length;

    // Page-visibility observer (updates "Seite X / N" display)
    const pageObs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) {
        const pg = parseInt((visible[0].target as HTMLElement).dataset.page || '1');
        setCurrentPage(pg);
      }
    }, { root: scrollRef.current, threshold: 0.3 });
    pageObserverRef.current = pageObs;

    // Lazy-render observer (renders pages when they enter viewport ± 600px)
    const lazyObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const pg = parseInt(el.dataset.page || '0');
        if (pg > 0 && !renderedPagesRef.current.has(pg)) {
          renderedPagesRef.current.add(pg);
          lazyObs.unobserve(el);
          renderPage(pg, el);
        }
      });
    }, { root: scrollRef.current, rootMargin: '600px 0px', threshold: 0 });
    lazyObserverRef.current = lazyObs;

    // Create placeholder divs for all pages
    for (let p = 1; p <= numPages; p++) {
      const viewport = cachedPagesRef.current[p - 1]?.getViewport({ scale: currentScale });
      const w = viewport?.width ?? 600;
      const h = viewport?.height ?? 800;

      const wrapper = document.createElement('div');
      wrapper.dataset.page = String(p);
      wrapper.style.cssText = [
        'position:relative',
        `width:${w}px`,
        `height:${h}px`,
        'margin:0 auto 16px',
        'background:white',
        'box-shadow:0 2px 12px rgba(0,0,0,0.3)',
        'border-radius:2px',
        'flex-shrink:0',
      ].join(';');

      container.appendChild(wrapper);
      pageObs.observe(wrapper);
      lazyObs.observe(wrapper);
    }
  }

  // ── Page renderer (called lazily) ──────────────────────────────────────────
  async function renderPage(pageNum: number, wrapper: HTMLElement) {
    const pdfjsLib = (window as any).pdfjsLib;
    const page = cachedPagesRef.current[pageNum - 1];
    const tc = cachedTextContentsRef.current[pageNum - 1];
    if (!page || !tc) return;

    const currentScale = scaleRef.current;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const viewport = page.getViewport({ scale: currentScale });

    // Sync wrapper size (in case it changed from estimate)
    wrapper.style.width = viewport.width + 'px';
    wrapper.style.height = viewport.height + 'px';

    // Canvas — high-DPI (Retina fix)
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.cssText = `position:absolute;top:0;left:0;display:block;width:${viewport.width}px;height:${viewport.height}px;`;
    wrapper.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Text layer
    const tl = document.createElement('div');
    tl.style.cssText = [
      'position:absolute', 'top:0', 'left:0',
      `width:${viewport.width}px`,
      `height:${viewport.height}px`,
      'overflow:hidden',
      'pointer-events:auto',
    ].join(';');
    wrapper.appendChild(tl);

    // Build itemIndex → TextItem map for this page
    const pageItems = textItemsRef.current.filter(i => i.pageNum === pageNum);
    const itemMap = new Map<number, TextItem>();
    for (const ti of pageItems) itemMap.set(ti.itemIndex, ti);

    // Create spans
    for (let i = 0; i < tc.items.length; i++) {
      const raw = tc.items[i] as any;
      if (!raw.str) continue;

      const span = document.createElement('span');
      span.textContent = raw.str;

      const tx = pdfjsLib.Util.transform(viewport.transform, raw.transform);
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

      span.style.cssText = [
        'position:absolute',
        `left:${tx[4]}px`,
        `top:${tx[5] - fontHeight}px`,
        `font-size:${fontHeight}px`,
        `font-family:${raw.fontName || 'sans-serif'}`,
        'color:transparent',
        'white-space:pre',
        'cursor:pointer',
        'user-select:none',
        'border-radius:2px',
        'transition:background 0.1s',
      ].join(';');

      // Apply horizontal scale: use PDF item width for accurate overlay alignment
      // tx[0] = a (horizontal scale component after transform)
      if (raw.width && raw.width > 0) {
        const pdfWidth = raw.width * currentScale;
        // rendered font width estimate: fontHeight * 0.6 per char is approximate,
        // but we use the canvas text width if available, else fall back to scaleX
        span.style.width = pdfWidth + 'px';
        span.style.display = 'inline-block';
        span.style.overflow = 'hidden';
      }

      // Link span to TextItem
      const textItem = itemMap.get(i);
      if (textItem) textItem.spanEl = span;

      // Click: seek TTS — find clicked word in cleaned_text
      const capturedItem = textItem;
      span.addEventListener('click', () => {
        const cb = onSeekToCharRef.current;
        if (!cb || !capturedItem) return;
        const ct = chapterTextRef.current || '';
        if (!ct) return;

        // Strategy: search for the clicked word/phrase in cleaned_text.
        // If found multiple times, pick the occurrence whose position ratio
        // best matches the span's ratio within all PDF items.
        const clickedStr = (capturedItem.str || '').trim();
        if (!clickedStr) return;

        const allItems = textItemsRef.current;
        const spanRatio = allItems.length > 1
          ? allItems.findIndex(it => it === capturedItem) / (allItems.length - 1)
          : 0;
        const targetCharApprox = Math.floor(spanRatio * ct.length);

        // Find all occurrences of clickedStr in cleaned_text
        const occurrences: number[] = [];
        let searchFrom = 0;
        while (true) {
          const pos = ct.indexOf(clickedStr, searchFrom);
          if (pos < 0) break;
          occurrences.push(pos);
          searchFrom = pos + 1;
        }

        let charInChapter: number;
        if (occurrences.length === 0) {
          // Word not found verbatim — try first significant word in span
          const words = clickedStr.split(/\s+/).filter(w => w.length > 3);
          let found = -1;
          for (const w of words) {
            const p = ct.indexOf(w);
            if (p >= 0) { found = p; break; }
          }
          charInChapter = found >= 0 ? found : targetCharApprox;
        } else if (occurrences.length === 1) {
          charInChapter = occurrences[0];
        } else {
          // Pick occurrence closest to the estimated ratio position
          charInChapter = occurrences.reduce((best, pos) =>
            Math.abs(pos - targetCharApprox) < Math.abs(best - targetCharApprox) ? pos : best
          );
        }

        cb(Math.max(0, Math.min(charInChapter, ct.length - 1)));
      });

      span.addEventListener('mouseenter', () => {
        if (!span.classList.contains('pdf-hl'))
          span.style.background = 'rgba(59,130,246,0.15)';
      });
      span.addEventListener('mouseleave', () => {
        if (!span.classList.contains('pdf-hl'))
          span.style.background = '';
      });

      tl.appendChild(span);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getChapterStart(): number {
    const ct = chapterTextRef.current;
    if (ct === chapterTextCacheRef.current && chapterStartRef.current >= 0) {
      return chapterStartRef.current;
    }
    const start = findChapterStart(fullPdfTextRef.current, ct);
    chapterStartRef.current = start;
    chapterTextCacheRef.current = ct;
    return start;
  }

  function clearHighlight() {
    if (highlightedSpanRef.current) {
      highlightedSpanRef.current.classList.remove('pdf-hl');
      highlightedSpanRef.current.style.background = '';
      highlightedSpanRef.current = null;
    }
  }

  function injectCSS() {
    if (document.getElementById('pdf-viewer-v2-style')) return;
    const s = document.createElement('style');
    s.id = 'pdf-viewer-v2-style';
    s.textContent = `
      .pdf-hl {
        background: rgba(232, 184, 0, 0.45) !important;
        border-radius: 2px;
        color: transparent;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Toolbar style ──────────────────────────────────────────────────────────
  const tb: React.CSSProperties = {
    padding: '3px 9px',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: '#525659',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px', background: '#3d3f41',
        flexShrink: 0, gap: '8px',
      }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
          Seite {currentPage} / {totalPages}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setScale(s => parseFloat(Math.max(0.5, s - 0.2).toFixed(1)))}
            style={tb}
          >−</button>
          <span style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.7)',
            minWidth: '38px', textAlign: 'center',
          }}>{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => parseFloat(Math.min(3.0, s + 0.2).toFixed(1)))}
            style={tb}
          >+</button>
          <button onClick={() => setScale(1.3)} style={{ ...tb, fontSize: '10px' }}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Scroll container ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'auto',
          padding: '20px', background: '#525659',
        }}
      >
        {loading && (
          <div style={{
            color: 'rgba(255,255,255,0.7)', textAlign: 'center',
            padding: '60px 20px', fontSize: '15px',
          }}>
            ⏳ PDF wird geladen…
          </div>
        )}
        {error && (
          <div style={{ color: '#fca5a5', textAlign: 'center', padding: '40px 20px' }}>
            ⚠️ {error}
          </div>
        )}
        {/* Pages are injected imperatively by rebuildLayout / renderPage */}
        <div
          ref={containerRef}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        />
      </div>
    </div>
  );
}
