import { NextRequest, NextResponse } from 'next/server';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

// PDF.js Worker: Pfad über process.cwd() (funktioniert in Next.js API-Routes / Vercel)
const workerPath = path.join(
  process.cwd(),
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
);
GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

interface RawItem {
  text: string;
  x: number;
  y: number;
  h: number;
  repeated: boolean; // true = 4x AKAD-Encoding (Überschrift/Nummer)
}

/**
 * Extrahiert Text aus einem PDF mit PDF.js.
 * Nutzt Positionsdaten (x/y) um Header, Footer und Seitenzahlen zu filtern.
 * Dedupliziert 4x-kodierte AKAD-Texte (gleicher Text × 4 an gleicher Position).
 */
async function extractWithPDFjs(
  uint8: Uint8Array
): Promise<{ pages: string[][]; totalPages: number }> {
  const pdf = await getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const totalPages = pdf.numPages;
  const allPages: string[][] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const vp = page.getViewport({ scale: 1 });
    const pageH = vp.height; // A4 = 841.89 pt
    const pageW = vp.width;  // A4 = 595.28 pt
    const tc = await page.getTextContent();

    // Schritt 1: Sammle Items mit Positionen
    // Gruppiere nach gerundeter Position (3px-Raster) um 4x-Duplikate zu erkennen
    const groups = new Map<
      string,
      { texts: string[]; x: number; y: number; h: number }
    >();

    for (const raw of tc.items) {
      if (!('str' in raw)) continue;
      const text = raw.str.trim();
      if (!text) continue;

      const x = raw.transform[4];
      const y = raw.transform[5];
      const h = raw.height;

      // Footer filtern (untere 8% der Seite = "Kapitel N", "å TME102" etc.)
      if (y < pageH * 0.08) continue;
      // Seitenzahl filtern (obere 5%, rechte 45%)
      if (y > pageH * 0.94 && x > pageW * 0.55) continue;

      const key = `${Math.round(x / 3) * 3}_${Math.round(y / 3) * 3}`;
      if (!groups.has(key)) groups.set(key, { texts: [], x, y, h });
      groups.get(key)!.texts.push(text);
    }

    // Schritt 2: Deduplizieren — 4x gleicher Text = AKAD-Encoding
    const items: RawItem[] = [];
    for (const g of groups.values()) {
      const textCounts = new Map<string, number>();
      for (const t of g.texts) textCounts.set(t, (textCounts.get(t) || 0) + 1);
      const [topText, topCount] = [...textCounts.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0];
      items.push({
        text: topText,
        x: g.x,
        y: g.y,
        h: g.h,
        repeated: topCount >= 4,
      });
    }

    // Schritt 3: Sortieren — von oben nach unten (y desc), links nach rechts (x asc)
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Schritt 4: Bekannte Nicht-Inhalt-Zeilen global filtern
    const lines: string[] = [];
    for (const item of items) {
      const t = item.text;
      if (/^Prof\.\s+Dr\./i.test(t)) continue;
      if (/^[©®]|^Copyright/i.test(t)) continue;
      if (/^Art\.-Nr\./i.test(t)) continue;
      if (/^K\d{4}$/.test(t)) continue;
      // Markiere 4x-kodierte Items mit einem Tag für splitIntoChapters
      lines.push(item.repeated ? `\x01${t}` : t);
    }

    allPages.push(lines);
  }

  return { pages: allPages, totalPages };
}

/**
 * Findet den ersten echten Inhaltsbereich: überspringt Cover, Inhaltsverzeichnis
 * und Copyright-Seiten (haben keine 4x-kodierten Items).
 */
function findContentStart(pages: string[][]): number {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].some(l => l.startsWith('\x01'))) return i;
  }
  return 0; // Fallback: ab Seite 0
}

function splitIntoChapters(pages: string[][], filename: string) {
  const chapters: any[] = [];
  let currentTitle = 'Einleitung';
  let currentLines: string[] = [];
  let chapterNum = 0;
  let pendingNumber: string | null = null;

  // Überschrift-Pattern (nach Dekodierung)
  const chapterHeadingRe =
    /^(\d+(?:\.\d+)*\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,\\/\-]{2,80}|Einleitung(?:\s*(?:und|\/)\s*Lernziele)?|Zusammenfassung|Lernziele|Vorwort|Literaturverzeichnis|Antworten zu den Kontrollfragen)$/;

  // TOC-Einträge: "1.1 Titel 5" (endet auf Seitenzahl)
  const isTocEntry = (s: string) => /\s\d{1,3}$/.test(s) && /^\d/.test(s);

  const flush = () => {
    if (currentLines.length === 0) return;
    chapterNum++;
    const body = currentLines.join('\n').trim();
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    chapters.push({
      id: generateId(),
      chapter_num: chapterNum,
      title: currentTitle,
      cleaned_text: body,
      word_count: wordCount,
      duration_seconds: Math.round(wordCount / 2.5),
      audio_path: null,
      audio_status: 'pending',
      created_at: new Date().toISOString(),
    });
  };

  const startPage = findContentStart(pages);

  for (const page of pages.slice(startPage)) {
    for (const rawLine of page) {
      const isRepeated = rawLine.startsWith('\x01');
      const trimmed = isRepeated ? rawLine.slice(1) : rawLine;
      if (!trimmed) continue;

      // 4x-kodierte reine Zahl = Kapitelnummer (z.B. "1", "1.2", "2.3.1")
      if (isRepeated && /^\d+(?:\.\d+)*$/.test(trimmed)) {
        pendingNumber = trimmed;
        continue;
      }

      // Überschrift-Erkennung
      let isHeading = false;
      let headingTitle = trimmed;

      if (pendingNumber !== null) {
        const combined = `${pendingNumber} ${trimmed}`;
        if (chapterHeadingRe.test(combined) && !isTocEntry(combined)) {
          headingTitle = combined;
          isHeading = true;
        }
        pendingNumber = null;
      }

      // Direkte Überschrift (z.B. "Einleitung und Lernziele" als 4x-kodiert)
      if (!isHeading && isRepeated && chapterHeadingRe.test(trimmed) && !isTocEntry(trimmed)) {
        isHeading = true;
        headingTitle = trimmed;
      }

      if (isHeading) {
        if (currentLines.length > 0 || chapters.length > 0) flush();
        currentTitle = headingTitle;
        currentLines = [];
      } else {
        // Sehr kurze Zeilen (Formel-Variablen, Einzelbuchstaben) überspringen
        if (trimmed.length > 3) {
          currentLines.push(trimmed);
        }
      }
    }
  }

  flush();

  // Fallback: kein Kapitel erkannt → nach Wortanzahl splitten
  if (chapters.length <= 1) {
    const allText = pages
      .slice(startPage)
      .flatMap(p => p.map(l => (l.startsWith('\x01') ? l.slice(1) : l)))
      .filter(l => l.length > 3)
      .join(' ');
    const words = allText.split(/\s+/).filter(Boolean);
    const chunkSize = 1500;
    return Array.from({ length: Math.ceil(words.length / chunkSize) }, (_, i) => {
      const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
      const wc = chunk.split(/\s+/).length;
      return {
        id: generateId(),
        chapter_num: i + 1,
        title: `Teil ${i + 1}`,
        cleaned_text: chunk,
        word_count: wc,
        duration_seconds: Math.round(wc / 2.5),
        audio_path: null,
        audio_status: 'pending',
        created_at: new Date().toISOString(),
      };
    });
  }

  return chapters;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', success: false },
        { status: 400 }
      );
    }
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported', success: false },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const { pages, totalPages } = await extractWithPDFjs(uint8);

    const documentId = generateId();
    const chaptersRaw = splitIntoChapters(pages, file.name);
    const chapters = chaptersRaw.map(ch => ({ ...ch, document_id: documentId }));

    const totalWords = chapters.reduce((s, c) => s + c.word_count, 0);
    const document = {
      id: documentId,
      filename: file.name,
      chapters_count: chapters.length,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'ready',
      extraction: `${totalPages} Seiten, ${totalWords} Wörter, ${chapters.length} Kapitel (PDF.js)`,
    };

    console.log(
      `[UPLOAD] "${file.name}" → ${chapters.length} Kapitel, ${totalPages} Seiten, ${totalWords} Wörter`
    );

    return NextResponse.json({
      success: true,
      document,
      chapters,
      message: `"${file.name}" hochgeladen — ${chapters.length} Kapitel extrahiert.`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[UPLOAD ERROR] ${errorMsg}`);
    return NextResponse.json(
      { success: false, error: 'Upload failed', details: errorMsg },
      { status: 500 }
    );
  }
}
