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
  itemIndex: number;
  spanEl?: HTMLSpanElement;
}

// Sucht chapterText im fullPdfText — beide haben jetzt Leerzeichen, passt zusammen
function findChapterStart(fullText: string, chapterText: string): number {
  if (!chapterText || !fullText) return -1;
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  for (const len of [120, 60, 30]) {
    const needle = norm(chapterText.substring(0, len));
    if (needle.length < 10) continue;
    const idx = norm(fullText).indexOf(needle);
    if (idx >= 0) return idx;
  }
  return -1;
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
  const fullPdfTextRef = useRef(''); // MIT Leerzeichen — muss zu globalStart/End passen!

  // Chapter cache — recomputed when chapterText changes
  const chapterStartRef = useRef(-1);
  const chapterEndRef = useRef(Infinity);
  const chItemsRef = useRef<TextItem[]>([]); // gecacht, nicht bei jedem Event neu filtern
  const chapterTextCacheRef = useRef('');

  // Highlight tracking
  const highlightedSpanRef = useRef<HTMLSpanElement | null>(null);
  const lastMatchedItemRef = useRef(0);
  const lastHighlightCharRef = useRef(-1);

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

  // ── PDF.js von CDN laden ───────────────────────────────────────────────────
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

  // Neu laden wenn pdfBytes sich ändern
  useEffect(() => {
    if ((window as any)?.pdfjsLib && pdfBytes?.length) initPDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBytes]);

  // Layout neu bauen bei Zoom-Änderung
  useEffect(() => {
    if (pdfDocRef.current && cachedPagesRef.current.length) rebuildLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Kapitel gewechselt → Cache + Pointer zurücksetzen + zu Kapitelanfang scrollen
  useEffect(() => {
    if (!chapterText) return;
    rebuildChapterCache(chapterText);
    lastMatchedItemRef.current = 0;
    lastHighlightCharRef.current = -1;
    // Zum ersten Item des Kapitels scrollen
    scrollToChapterStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterText]);

  // ── Highlight ──────────────────────────────────────────────────────────────
  useEffect(() => {
    clearHighlight();
    if (highlightCharIndex < 0 || !chapterText) return;

    const useItems = chItemsRef.current;
    if (!useItems.length) return;

    // Rückwärts-Seek erkannt → Pointer neu setzen
    const prevChar = lastHighlightCharRef.current;
    if (highlightCharIndex < prevChar - 150) {
      const ratio = Math.max(0, Math.min(1, highlightCharIndex / (chapterText.length - 1 || 1)));
      lastMatchedItemRef.current = Math.floor(ratio * useItems.length);
    }
    lastHighlightCharRef.current = highlightCharIndex;

    // Aktuell gesprochenes Wort aus cleaned_text
    let wS = highlightCharIndex;
    let wE = highlightCharIndex;
    while (wS > 0 && chapterText[wS - 1] !== ' ') wS--;
    while (wE < chapterText.length && chapterText[wE] !== ' ') wE++;
    const word = chapterText.slice(wS, wE).toLowerCase().replace(/[^a-zäöüß0-9]/gi, '');

    // Vorwärts-Suche (max 30 Items, nie rückwärts)
    const from = lastMatchedItemRef.current;
    const to = Math.min(useItems.length - 1, from + 30);
    let foundIdx = from; // Fallback: bleib am aktuellen Pointer

    if (word.length >= 3) {
      for (let j = from; j <= to; j++) {
        const s = (useItems[j].str || '').toLowerCase().replace(/[^a-zäöüß0-9]/gi, '');
        if (s.length >= 2 && (s.includes(word) || word.startsWith(s.substring(0, Math.min(s.length, 4))))) {
          foundIdx = j;
          break;
        }
      }
    }

    lastMatchedItemRef.current = Math.min(foundIdx, useItems.length - 1);
    const item = useItems[lastMatchedItemRef.current];

    if (item?.spanEl) {
      item.spanEl.classList.add('pdf-hl');
      highlightedSpanRef.current = item.spanEl;
      // Nur scrollen wenn Span nicht sichtbar
      const rect = item.spanEl.getBoundingClientRect();
      const vH = window.innerHeight;
      if (rect.top < 80 || rect.bottom > vH - 80) {
        item.spanEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightCharIndex, chapterText]);

  // Cleanup
  useEffect(() => {
    return () => {
      lazyObserverRef.current?.disconnect();
      pageObserverRef.current?.disconnect();
    };
  }, []);

  // ── Kapitel-Cache aufbauen ─────────────────────────────────────────────────
  function rebuildChapterCache(ct: string) {
    if (ct === chapterTextCacheRef.current) return; // kein Rebuild nötig
    chapterTextCacheRef.current = ct;

    const allItems = textItemsRef.current;
    if (!allItems.length || !ct) {
      chapterStartRef.current = -1;
      chapterEndRef.current = Infinity;
      chItemsRef.current = allItems;
      return;
    }

    const chStart = findChapterStart(fullPdfTextRef.current, ct);
    const chEnd = chStart >= 0 ? chStart + Math.floor(ct.length * 1.6) : Infinity;

    chapterStartRef.current = chStart;
    chapterEndRef.current = chEnd;

    const chItems = allItems.filter(it =>
      it.globalStart >= Math.max(0, chStart) && it.globalStart < chEnd
    );
    // Fallback: wenn zu wenig Items → alle nehmen (single-chapter PDF)
    chItemsRef.current = chItems.length >= 5 ? chItems : allItems;
  }

  // ── Zum Kapitelanfang scrollen ─────────────────────────────────────────────
  function scrollToChapterStart() {
    const items = chItemsRef.current;
    if (!items.length) return;
    // Ersten span mit gesetztem spanEl finden
    const first = items.find(it => it.spanEl);
    if (first?.spanEl) {
      setTimeout(() => {
        first.spanEl!.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

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
    const pdfTextParts: string[] = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      pages.push(page);
      textContents.push(tc);

      for (let i = 0; i < tc.items.length; i++) {
        const raw = tc.items[i] as any;
        if (!raw.str) continue;
        const str = raw.str;
        // Trailing space hinzufügen (damit globalStart/End mit fullPdfText übereinstimmen)
        const sep = str.endsWith(' ') ? '' : ' ';
        textItems.push({
          str,
          globalStart: offset,
          globalEnd: offset + str.length,
          pageNum: p,
          itemIndex: i,
        });
        pdfTextParts.push(str + sep);
        offset += str.length + sep.length;
      }
    }

    cachedPagesRef.current = pages;
    cachedTextContentsRef.current = textContents;
    textItemsRef.current = textItems;
    // WICHTIG: mit Leerzeichen bauen — muss zu globalStart/End passen
    fullPdfTextRef.current = pdfTextParts.join('');

    // Kapitel-Cache mit aktuellem chapterText aufbauen
    chapterTextCacheRef.current = '';
    rebuildChapterCache(chapterTextRef.current);
    lastMatchedItemRef.current = 0;
    lastHighlightCharRef.current = -1;
  }

  // ── Layout builder ─────────────────────────────────────────────────────────
  function rebuildLayout() {
    const container = containerRef.current;
    if (!container || !cachedPagesRef.current.length) return;

    lazyObserverRef.current?.disconnect();
    pageObserverRef.current?.disconnect();
    renderedPagesRef.current.clear();
    clearHighlight();

    for (const item of textItemsRef.current) item.spanEl = undefined;
    container.innerHTML = '';
    injectCSS();

    const currentScale = scaleRef.current;
    const numPages = cachedPagesRef.current.length;

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
    }, { root: scrollRef.current, rootMargin: '700px 0px', threshold: 0 });
    lazyObserverRef.current = lazyObs;

    for (let p = 1; p <= numPages; p++) {
      const viewport = cachedPagesRef.current[p - 1]?.getViewport({ scale: currentScale });
      const w = viewport?.width ?? 600;
      const h = viewport?.height ?? 800;

      const wrapper = document.createElement('div');
      wrapper.dataset.page = String(p);
      wrapper.style.cssText = [
        'position:relative', `width:${w}px`, `height:${h}px`,
        'margin:0 auto 16px', 'background:white',
        'box-shadow:0 2px 12px rgba(0,0,0,0.3)', 'border-radius:2px', 'flex-shrink:0',
      ].join(';');

      container.appendChild(wrapper);
      pageObs.observe(wrapper);
      lazyObs.observe(wrapper);
    }
  }

  // ── Seite rendern (lazy) ───────────────────────────────────────────────────
  async function renderPage(pageNum: number, wrapper: HTMLElement) {
    const pdfjsLib = (window as any).pdfjsLib;
    const page = cachedPagesRef.current[pageNum - 1];
    const tc = cachedTextContentsRef.current[pageNum - 1];
    if (!page || !tc) return;

    const currentScale = scaleRef.current;
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: currentScale });

    wrapper.style.width = viewport.width + 'px';
    wrapper.style.height = viewport.height + 'px';

    // Canvas (Retina-fix)
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.cssText = `position:absolute;top:0;left:0;width:${viewport.width}px;height:${viewport.height}px;`;
    wrapper.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Text layer
    const tl = document.createElement('div');
    tl.style.cssText = [
      'position:absolute', 'top:0', 'left:0',
      `width:${viewport.width}px`, `height:${viewport.height}px`,
      'overflow:hidden', 'pointer-events:auto',
    ].join(';');
    wrapper.appendChild(tl);

    // itemIndex → TextItem Map für diese Seite
    const pageItems = textItemsRef.current.filter(i => i.pageNum === pageNum);
    const itemMap = new Map<number, TextItem>();
    for (const ti of pageItems) itemMap.set(ti.itemIndex, ti);

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

      if (raw.width && raw.width > 0) {
        span.style.width = (raw.width * currentScale) + 'px';
        span.style.display = 'inline-block';
        span.style.overflow = 'hidden';
      }

      const textItem = itemMap.get(i);
      if (textItem) textItem.spanEl = span;

      // Click: gesuchtes Wort in cleaned_text suchen
      const capturedItem = textItem;
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        const cb = onSeekToCharRef.current;
        if (!cb || !capturedItem) return;
        const ct = chapterTextRef.current || '';
        if (!ct) return;

        const clickedStr = (capturedItem.str || '').trim();
        if (!clickedStr) return;

        // Ratio des angeklickten Items innerhalb der Kapitel-Items
        const items = chItemsRef.current;
        const idxInCh = items.findIndex(it => it === capturedItem);
        const spanRatio = items.length > 1 && idxInCh >= 0
          ? idxInCh / (items.length - 1) : 0.5;
        const targetChar = Math.floor(spanRatio * ct.length);

        // Vorkommen von clickedStr in cleaned_text finden
        const ctLower = ct.toLowerCase();
        const needle = clickedStr.toLowerCase();
        const hits: number[] = [];
        let pos = 0;
        while ((pos = ctLower.indexOf(needle, pos)) >= 0) {
          hits.push(pos);
          pos++;
          if (hits.length > 50) break;
        }

        let charInChapter: number;
        if (hits.length === 0) {
          // Längstes Wort aus Span suchen
          const words = clickedStr.split(/[\s,.:;!?()\[\]]+/).filter(w => w.length > 3)
            .sort((a, b) => b.length - a.length);
          let found = -1;
          for (const w of words) {
            const p = ctLower.indexOf(w.toLowerCase());
            if (p >= 0) { found = p; break; }
          }
          charInChapter = found >= 0 ? found : targetChar;
        } else if (hits.length === 1) {
          charInChapter = hits[0];
        } else {
          // Nächstes Vorkommen zur erwarteten Position
          charInChapter = hits.reduce((best, p) =>
            Math.abs(p - targetChar) < Math.abs(best - targetChar) ? p : best
          );
        }

        // Highlight-Pointer auf Klick-Position setzen
        lastMatchedItemRef.current = Math.max(0, idxInCh >= 0 ? idxInCh - 1 : 0);
        lastHighlightCharRef.current = charInChapter - 10;

        cb(Math.max(0, Math.min(charInChapter, ct.length - 1)));
      });

      span.addEventListener('mouseenter', () => {
        if (!span.classList.contains('pdf-hl'))
          span.style.background = 'rgba(59,130,246,0.12)';
      });
      span.addEventListener('mouseleave', () => {
        if (!span.classList.contains('pdf-hl'))
          span.style.background = '';
      });

      tl.appendChild(span);
    }

    // Nach Render: Kapitel-Cache aktualisieren (spanEl jetzt gesetzt)
    // und Highlight-Pointer updaten falls nötig
    if (pageNum === chItemsRef.current[0]?.pageNum) {
      // Erste Seite des Kapitels wurde gerendert
      // Falls wir noch am Anfang stehen, zum richtigen Span scrollen
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function clearHighlight() {
    if (highlightedSpanRef.current) {
      highlightedSpanRef.current.classList.remove('pdf-hl');
      highlightedSpanRef.current.style.background = '';
      highlightedSpanRef.current = null;
    }
  }

  function injectCSS() {
    if (document.getElementById('pdf-hl-style')) return;
    const s = document.createElement('style');
    s.id = 'pdf-hl-style';
    s.textContent = `.pdf-hl { background: rgba(232,184,0,0.45) !important; border-radius: 2px; }`;
    document.head.appendChild(s);
  }

  const tb: React.CSSProperties = {
    padding: '3px 9px', background: 'rgba(255,255,255,0.15)',
    border: 'none', borderRadius: '4px', color: 'white',
    cursor: 'pointer', fontSize: '13px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#525659', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#3d3f41', flexShrink: 0, gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
          Seite {currentPage} / {totalPages}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setScale(s => parseFloat(Math.max(0.5, s - 0.2).toFixed(1)))} style={tb}>−</button>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', minWidth: '38px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => setScale(s => parseFloat(Math.min(3.0, s + 0.2).toFixed(1)))} style={tb}>+</button>
          <button onClick={() => setScale(1.3)} style={{ ...tb, fontSize: '10px' }}>Reset</button>
        </div>
      </div>

      {/* Scroll-Container */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '20px', background: '#525659' }}>
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '60px 20px', fontSize: '15px' }}>
            ⏳ PDF wird geladen…
          </div>
        )}
        {error && (
          <div style={{ color: '#fca5a5', textAlign: 'center', padding: '40px 20px' }}>⚠️ {error}</div>
        )}
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} />
      </div>
    </div>
  );
}
