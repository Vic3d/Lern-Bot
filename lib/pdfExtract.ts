/**
 * Client-side PDF Extraction via pdfjs-dist
 * Läuft im Browser — kein Server nötig.
 *
 * Enthält AKAD-Encoding-Deduplication (4x-Text-Fix):
 * AKAD-PDFs legen denselben Text bis zu 4x an derselben Position übereinander
 * (für Druckqualität). Ohne Dedup wird jeder Satz 4x vorgelesen.
 *
 * Fix portiert aus app/api/documents/upload/route.ts (Server-seitige Variante).
 */

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// ─── AKAD Deduplication ──────────────────────────────────────────────────────

interface TextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, x, y]
  width?: number;
}

/** Zählt wie oft item.str an gleicher Position (±4pt) im Array vorkommt */
function countDuplicates(item: TextItem, items: TextItem[]): number {
  const str = item.str.trim();
  const x = item.transform[4];
  const y = item.transform[5];
  return items.filter(
    k =>
      k.str.trim() === str &&
      Math.abs(k.transform[4] - x) <= 4 &&
      Math.abs(k.transform[5] - y) <= 4
  ).length;
}

/**
 * Bounding-Box-Deduplication: entfernt Items an gleicher Position mit gleichem Text.
 * Gibt {item, count} zurück — count = wie oft das Item im Original vorkam.
 * count≥2 = AKAD-Encoding (gleicher Text N-fach an gleicher Position).
 */
function deduplicateItems(items: TextItem[]): Array<{ item: TextItem; count: number }> {
  const kept: Array<{ item: TextItem; count: number }> = [];
  for (const item of items) {
    const str = item.str.trim();
    const x = item.transform[4];
    const y = item.transform[5];
    const isDuplicate = kept.some(
      k =>
        k.item.str.trim() === str &&
        Math.abs(k.item.transform[4] - x) <= 4 &&
        Math.abs(k.item.transform[5] - y) <= 4
    );
    if (!isDuplicate) {
      kept.push({ item, count: countDuplicates(item, items) });
    }
  }
  return kept;
}

/**
 * Sicherheitsnetz gegen verbleibende Wiederholungen nach Dedup.
 * Fängt Fälle ab wo Dedup nicht greift (z.B. leicht unterschiedliche Koordinaten).
 */
function sanitizeText(text: string): string {
  if (!text) return text;

  // Inline-Wiederholungen: "WortWortWortWort" → "Wort"
  let cleaned = text.replace(/(.{4,}?)\1{2,}/g, '$1');

  // Zeilen-Wiederholungen: gleiche Zeile hintereinander
  const lines = cleaned.split('\n');
  const deduped: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    const recent = deduped.slice(-3).map(l => l.trim());
    if (!t || !recent.includes(t)) {
      deduped.push(line);
    }
  }

  return deduped.join('\n').trim();
}

// ─── Text assembly per page ───────────────────────────────────────────────────

/**
 * Extrahiert Text einer einzelnen PDF-Seite mit korrekter Deduplication.
 * - Filtert Header/Footer-Zone
 * - Dedupliziert AKAD-Encoded Items
 * - Gruppiert nach Y-Position (gleiche Zeile)
 * - Baut Text mit korrekten Leerzeichen (verhindert "WortEinhängen")
 */
function extractPageText(
  items: TextItem[],
  pageHeight: number
): string {
  // Header-Zone: y > 92% → Seitenzahlen oben
  // Footer-Zone: y < 8%  → "Kapitel N", Kürzel unten
  const HEADER_Y = pageHeight * 0.92;
  const FOOTER_Y = pageHeight * 0.08;

  // Schritt 1: Inhaltszone filtern + Dedup
  const rawItems = items.filter(
    item => item.str?.trim() && item.transform[5] > FOOTER_Y && item.transform[5] < HEADER_Y
  );
  const dedupedItems = deduplicateItems(rawItems);

  // Schritt 2: Items nach Y-Position gruppieren (±3pt = gleiche Zeile)
  const yMap = new Map<number, Array<{ item: TextItem; count: number }>>();
  for (const entry of dedupedItems) {
    const y = Math.round(entry.item.transform[5]);
    let matched = false;
    for (const [gy] of yMap) {
      if (Math.abs(gy - y) <= 3) {
        yMap.get(gy)!.push(entry);
        matched = true;
        break;
      }
    }
    if (!matched) yMap.set(y, [entry]);
  }

  // Schritt 3: Zeilen sortieren (oben → unten) und Text zusammensetzen
  const lines = [...yMap.entries()]
    .sort((a, b) => b[0] - a[0]) // PDF y-Achse: oben = größer
    .map(([, entries]) => {
      // Items innerhalb der Zeile: links → rechts
      entries.sort((a, b) => a.item.transform[4] - b.item.transform[4]);

      // Text zusammenbauen mit Leerzeichen-Heuristik
      let lineText = '';
      for (let k = 0; k < entries.length; k++) {
        // AKAD-Encoded: Originaltext des ersten Items (schon dedupliziert)
        const s = entries[k].item.str;
        if (k === 0) {
          lineText = s;
          continue;
        }
        // Leerzeichen einfügen wenn nötig (verhindert "Tragwerkebestehen")
        if (lineText.length && !lineText.endsWith(' ') && s.length && !s.startsWith(' ')) {
          const xGap =
            entries[k].item.transform[4] -
            (entries[k - 1].item.transform[4] + (entries[k - 1].item.width ?? 0));
          lineText += (xGap > 1 ? ' ' : '') + s;
        } else {
          lineText += s;
        }
      }
      return lineText.trim();
    })
    .filter(Boolean);

  return lines.join('\n');
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/** Filtert Seitenzahlen, einzelne Zeichen, etc. nach der Hauptextraktion */
function cleanText(text: string): string {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l || l.length < 2) return false;
      if (/^-?\s*\d+\s*-?$/.test(l)) return false; // reine Seitenzahlen
      if (/^Seite\s+\d+/i.test(l)) return false;
      return true;
    })
    .join('\n');
}

// ─── Chapter splitting ────────────────────────────────────────────────────────

function splitIntoChapters(text: string, filename: string, docId: string) {
  const headingPattern = /^(\d+[\.\d]*\s+[A-ZÄÖÜ][^\n]{3,80}|Einleitung.*|Zusammenfassung.*)$/;
  const lines = text.split('\n');
  const chapters: any[] = [];
  let currentTitle = 'Einleitung';
  let currentLines: string[] = [];
  let chapterNum = 0;

  for (const line of lines) {
    if (headingPattern.test(line) && currentLines.join('').length > 300) {
      if (currentLines.length > 0) {
        chapterNum++;
        const body = currentLines.join('\n').trim();
        const wordCount = body.split(/\s+/).filter(Boolean).length;
        chapters.push({
          id: generateId(),
          document_id: docId,
          chapter_num: chapterNum,
          title: currentTitle,
          cleaned_text: body,
          word_count: wordCount,
          duration_seconds: Math.round(wordCount / 2.5),
          audio_path: null,
          audio_status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
      currentTitle = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Letztes Kapitel
  if (currentLines.length > 0) {
    chapterNum++;
    const body = currentLines.join('\n').trim();
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    chapters.push({
      id: generateId(),
      document_id: docId,
      chapter_num: chapterNum,
      title: currentTitle,
      cleaned_text: body,
      word_count: wordCount,
      duration_seconds: Math.round(wordCount / 2.5),
      audio_path: null,
      audio_status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  // Fallback: nach Wortanzahl splitten wenn keine Kapitel erkannt
  if (chapters.length <= 1) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunkSize = 1500;
    const result: any[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      const num = Math.floor(i / chunkSize) + 1;
      const wordCount = words.slice(i, i + chunkSize).length;
      result.push({
        id: generateId(),
        document_id: docId,
        chapter_num: num,
        title: `${filename} — Teil ${num}`,
        cleaned_text: chunk,
        word_count: wordCount,
        duration_seconds: Math.round(wordCount / 2.5),
        audio_path: null,
        audio_status: 'pending',
        created_at: new Date().toISOString(),
      });
    }
    return result;
  }

  return chapters;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ExtractProgress {
  pagesTotal: number;
  pagesProcessed: number;
  stage: 'reading' | 'processing' | 'done';
}

export async function extractPDF(
  file: File,
  onProgress?: (progress: ExtractProgress) => void
): Promise<{
  document: any;
  chapters: any[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // pdfjs dynamisch laden (nur client-side)
  const pdfjs = await import('pdfjs-dist');

  // Worker per CDN laden (vermeidet import.meta.url / webpack-Konflikte)
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjs.getDocument({ data: uint8 }).promise;

  onProgress?.({ pagesTotal: pdf.numPages, pagesProcessed: 0, stage: 'reading' });

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    // Cast items — pdfjs types are loose, we only use str/transform/width
    const items = (textContent.items as any[]).filter(
      item => 'str' in item
    ) as TextItem[];

    // Dedup + layout-aware text extraction (AKAD encoding fix)
    const pageText = extractPageText(items, viewport.height);
    pageTexts.push(pageText);

    onProgress?.({ pagesTotal: pdf.numPages, pagesProcessed: pageNum, stage: 'reading' });
  }

  onProgress?.({ pagesTotal: pdf.numPages, pagesProcessed: pdf.numPages, stage: 'processing' });

  // Combine pages, sanitize (Sicherheitsnetz), then clean
  const rawText = pageTexts.join('\n');
  const sanitized = sanitizeText(rawText);   // Sicherheitsnetz gegen Restduplikate
  const cleanedText = cleanText(sanitized);  // Seitenzahlen, Kurzzeilen raus

  const docId = generateId();
  const chapters = splitIntoChapters(cleanedText, file.name, docId);

  onProgress?.({ pagesTotal: pdf.numPages, pagesProcessed: pdf.numPages, stage: 'done' });

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count ?? 0), 0);

  const document = {
    id: docId,
    filename: file.name,
    chapters_count: chapters.length,
    progress: 0,
    last_accessed: new Date().toISOString(),
    created_at: new Date().toISOString(),
    status: 'ready',
    extraction: `${pdf.numPages} Seiten, ${totalWords} Wörter, ${chapters.length} Kapitel`,
  };

  return { document, chapters };
}
