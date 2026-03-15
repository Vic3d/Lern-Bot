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
  if (!chapterText || !fullText) return -1;

  const lengths = [120, 60, 30];
  for (const len of lengths) {
    const needle = chapterText.substring(0, len).trim();
    if (!needle) continue;

    // Direct match
    const direct = fullText.indexOf(needle);
    if (direct >= 0) return direct;

    // Normalized: collapse whitespace, then search
    // WICHTIG: Index muss im Original-String sein, nicht im normalisierten
    const normNeedle = needle.replace(/\s+/g, ' ');
    // Suche Zeichen-für-Zeichen mit Whitespace-Toleranz
    const firstWord = normNeedle.split(' ')[0];
    if (firstWord.length < 4) continue;
    let pos = fullText.indexOf(firstWord);
    while (pos >= 0) {
      // Prüfe ob ab pos der normalisierte Text passt
      const slice = fullText.substring(pos, pos + len * 2).replace(/\s+/g, ' ');
      if (slice.startsWith(normNeedle)) return pos;
      pos = fullText.indexOf(firstWord, pos + 1);
    }
  }
  return -1; // nicht gefunden → -1 statt 0 (0 wäre falscher Match)
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
  const [fitWidth, setFitWidth] = useState(false);
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
  const lastMatchedItemRef = useRef(0);   // forward-only pointer in chItems
  const lastHighlightCharRef = useRef(-1); // detects backward seek (user clicked elsewhere)

  // Chapter items cache (recomputed when chapter changes, not on every highlight)
  const chItemsRef = useRef<TextItem[]>([]);

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

  // Reset on chapter change + rebuild chItems cache
  useEffect(() => {
    chapterStartRef.current = -1;
    chapterTextCacheRef.current = '';
    lastMatchedItemRef.current = 0;
    lastHighlightCharRef.current = -1;
    // chItems werden bei nächstem Highlight neu berechnet (textItems könnte noch leer sein)
    chItemsRef.current = [];
  }, [chapterText]);

  // ── Highlight: bounded chapter items + forward-only word search ──
  useEffect(() => {
    clearHighlight();
    if (highlightCharIndex < 0 || !chapterText || !chapterText.length) return;

    const allItems = textItemsRef.current;
    if (!allItems.length) return;

    // chItems gecacht — nur neu berechnen wenn noch leer (nach Kapitelwechsel)
    if (!chItemsRef.current.length) {
      const chStart = getChapterStart();
      const chEnd = chStart >= 0 ? chStart + Math.floor(chapterText.length * 1.5) : Infinity;
      const filtered = allItems.filter(it =>
        it.globalStart >= Math.max(0, chStart) && it.globalStart < chEnd
      );
      chItemsRef.current = filtered.length >= 5 ? filtered : allItems;
    }
    const useItems = chItemsRef.current;
    if (!useItems.length) return;

    // Rückwärts-Seek: User hat zu früherer Stelle gesprungen → Pointer zurücksetzen
    const prevChar = lastHighlightCharRef.current;
    if (highlightCharIndex < prevChar - 150) {
      const ratio = Math.max(0, Math.min(1, highlightCharIndex / (chapterText.length - 1 || 1)));
      lastMatchedItemRef.current = Math.floor(ratio * useItems.length);
    }
    lastHighlightCharRef.current = highlightCharIndex;

    // Aktuell gesprochenes Wort aus cleaned_text extrahieren
    let wStart = highlightCharIndex;
    while (wStart > 0 && chapterText[wStart - 1] !== ' ') wStart--;
    let wEnd = highlightCharIndex;
    while (wEnd < chapterText.length && chapterText[wEnd] !== ' ') wEnd++;
    const word = chapterText.slice(wStart, wEnd).toLowerCase().replace(/[^a-zäöüß0-9]/gi, '');

    // Vorwärts-Suche: max 30 Items nach vorne, NIE rückwärts
    const from = lastMatchedItemRef.current;
    const to = Math.min(useItems.length - 1, from + 30);
    let foundIdx = -1;

    if (word.length >= 3) {
      for (let j = from; j <= to; j++) {
        const s = (useItems[j].str || '').toLowerCase().replace(/[^a-zäöüß0-9]/gi, '');
        if (s.length >= 2 && (s.includes(word) || word.startsWith(s.substring(0, Math.min(s.length, 4))))) {
          foundIdx = j;
          break;
        }
      }
    }

    // Fallback: bleib am aktuellen Pointer (kein Rücksprung)
    if (foundIdx < 0) foundIdx = from;
    foundIdx = Math.min(foundIdx, useItems.length - 1);
    lastMatchedItemRef.current = foundIdx;

    const item = useItems[foundIdx];
    if (item?.spanEl) {
      item.spanEl.classList.add('pdf-hl');
      highlightedSpanRef.current = item.spanEl;
      // Scroll nur wenn Span außerhalb sichtbarem Bereich
      const rect = item.spanEl.getBoundingClientRect();
      const vH = window.innerHeight;
      if (rect.top < 80 || rect.bottom > vH - 80) {
        item.spanEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightCharIndex, chapterText]);

  // Fit-to-Width: scale berechnen damit PDF-Breite ins Scroll-Container passt
  useEffect(() => {
    if (!fitWidth || !cachedPagesRef.current.length) return;
    const container = scrollRef.current;
    if (!container) return;
    const containerW = container.clientWidth - 40; // 40 = padding
    const firstPage = cachedPagesRef.current[0];
    if (!firstPage) return;
    const baseViewport = firstPage.getViewport({ scale: 1.0 });
    const newScale = Math.min(3.0, Math.max(0.5, containerW / baseViewport.width));
    setScale(parseFloat(newScale.toFixed(2)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitWidth]);

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
    // fullPdfText MIT Leerzeichen bauen — muss mit globalStart-Offsets übereinstimmen
    // (globalStart wird mit trailingSpace gezählt, daher braucht fullPdfText auch Spaces)
    const parts: string[] = [];
    for (const it of textItems) {
      parts.push(it.str);
      if (!it.str.endsWith(' ')) parts.push(' ');
    }
    fullPdfTextRef.current = parts.join('');
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
    // Reset highlight pointer + chapter cache (spanEls invalidated after rebuild)
    lastMatchedItemRef.current = 0;
    lastHighlightCharRef.current = -1;
    chItemsRef.current = []; // force recompute after spanEls are re-linked

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
      span.addEventListener('click', (e) => { e.stopPropagation();
        const cb = onSeekToCharRef.current;
        if (!cb || !capturedItem) return;
        const ct = chapterTextRef.current || '';
        if (!ct) return;

        // Strategy: search for the clicked word/phrase in cleaned_text.
        // If found multiple times, pick the occurrence whose position ratio
        // best matches the span's ratio within the chapter items (not full PDF).
        const clickedStr = (capturedItem.str || '').trim();
        if (!clickedStr) return;

        const allItems = textItemsRef.current;
        // Use chapter-relative ratio: only items within this chapter
        const chStart = getChapterStart();
        const estimatedEnd = chStart >= 0 ? chStart + Math.floor(ct.length * 1.5) : Infinity;
        const chItems = allItems.filter(it =>
          it.globalStart >= (chStart >= 0 ? chStart : 0) && it.globalStart < estimatedEnd
        );
        const idxInCh = chItems.findIndex(it => it === capturedItem);
        const spanRatio = chItems.length > 1 && idxInCh >= 0
          ? idxInCh / (chItems.length - 1)
          : (allItems.length > 1 ? allItems.findIndex(it => it === capturedItem) / (allItems.length - 1) : 0);
        const targetCharApprox = Math.floor(spanRatio * ct.length);

        // Find all occurrences of clickedStr in cleaned_text (case-insensitive)
        const ctLower = ct.toLowerCase();
        const needleLower = clickedStr.toLowerCase();
        const occurrences: number[] = [];
        let searchFrom = 0;
        while (true) {
          const pos = ctLower.indexOf(needleLower, searchFrom);
          if (pos < 0) break;
          occurrences.push(pos);
          searchFrom = pos + 1;
          if (occurrences.length > 50) break; // safety
        }

        let charInChapter: number;
        if (occurrences.length === 0) {
          // Not found verbatim — try longest significant word from span
          const words = clickedStr.split(/[\s\-,.;:]+/).filter(w => w.length > 3);
          let found = -1;
          for (const w of words.sort((a,b) => b.length - a.length)) {
            const p = ctLower.indexOf(w.toLowerCase());
            if (p >= 0) { found = p; break; }
          }
          charInChapter = found >= 0 ? found : targetCharApprox;
        } else if (occurrences.length === 1) {
          charInChapter = occurrences[0];
        } else {
          // Pick occurrence closest to chapter-relative ratio position
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
    chapterStartRef.current = start; // -1 wenn nicht gefunden
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
        padding: '6px 12px', background: '#3d3f41',
        flexShrink: 0, gap: '8px',
      }}>
        {/* Seiten-Anzeige */}
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', minWidth: '70px' }}>
          {currentPage} / {totalPages}
        </span>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => { setFitWidth(false); setScale(s => parseFloat(Math.max(0.5, s - 0.15).toFixed(2))); }} style={tb}>−</button>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', minWidth: '36px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => { setFitWidth(false); setScale(s => parseFloat(Math.min(3.0, s + 0.15).toFixed(2))); }} style={tb}>+</button>
          <button
            onClick={() => { setFitWidth(f => !f); }}
            title="Auf Fensterbreite anpassen"
            style={{ ...tb, background: fitWidth ? 'rgba(232,184,0,0.4)' : 'rgba(255,255,255,0.15)', fontSize: '12px' }}
          >⊡</button>
          <button onClick={() => { setFitWidth(false); setScale(1.3); }} style={{ ...tb, fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
            1:1
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
