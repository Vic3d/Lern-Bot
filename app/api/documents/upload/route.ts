import { NextRequest, NextResponse } from 'next/server';
import { getDocumentProxy } from 'unpdf';

// unpdf übernimmt Worker-Setup für Node.js/Vercel — kein manueller Worker-Pfad nötig
// getDocumentProxy gibt uns die rohe PDF.js document proxy mit vollen Positions-Daten

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

interface LineItem {
  y: number;
  text: string;
  deduped: string;
  isEncoded: boolean; // true = Item war N≥2 mal an gleicher Position = AKAD-Encoding
}

/** Zählt wie oft item.str an gleicher Position (±4pt) im Array vorkommt */
function countDuplicates(item: any, items: any[]): number {
  const str = item.str.trim();
  const x = item.transform[4];
  const y = item.transform[5];
  return items.filter(
    (k) => k.str.trim() === str && Math.abs(k.transform[4] - x) <= 4 && Math.abs(k.transform[5] - y) <= 4
  ).length;
}

/**
 * Bounding-Box-Deduplication: entfernt Items an gleicher Position mit gleichem Text.
 * Gibt {item, count} zurück — count = wie oft das Item im Original vorkam.
 * So bleibt isEncoded auch NACH Dedup korrekt (count≥2 = encoded).
 */
function deduplicateItems(items: any[]): Array<{ item: any; count: number }> {
  const kept: Array<{ item: any; count: number }> = [];
  for (const item of items) {
    const str = item.str.trim();
    const x = item.transform[4];
    const y = item.transform[5];
    const isDuplicate = kept.some(
      (k) =>
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
 * Extrahiert Text aus PDF via unpdf (Worker-kompatibel auf Vercel).
 * Nutzt getDocumentProxy → getTextContent() für volle Positions-Daten.
 * Header/Footer werden per y-Position gefiltert, AKAD-Encoding per Bounding-Box-Dedup erkannt.
 */
async function extractPDFLayout(buffer: Uint8Array): Promise<LineItem[]> {
  const doc = await getDocumentProxy(buffer);
  const allLines: LineItem[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height; // A4 ≈ 842pt

    const textContent = await page.getTextContent();

    // Header-Zone: y > 92% → Seitenzahlen oben
    // Footer-Zone: y < 8%  → "Kapitel N", "å TME102" unten
    const HEADER_Y = pageHeight * 0.92;
    const FOOTER_Y = pageHeight * 0.08;

    // Schritt 1: Inhaltszone + Bounding-Box-Deduplication
    // count≥2 = AKAD-Encoding (gleicher Text N-fach an gleicher Position)
    const rawItems = (textContent.items as any[]).filter(
      (item) => item.str?.trim() && item.transform[5] > FOOTER_Y && item.transform[5] < HEADER_Y
    );
    const dedupedItems = deduplicateItems(rawItems);

    // Schritt 2: Items nach y-Position gruppieren (±3pt = gleiche Zeile)
    const yMap = new Map<number, Array<{ item: any; count: number }>>();
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

    // Schritt 3: Zeilen sortieren und Text zusammensetzen
    const sortedLines = [...yMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, entries]) => {
        entries.sort((a, b) => a.item.transform[4] - b.item.transform[4]);

        // Leerzeichen zwischen Items einfügen wenn nötig (verhindert "Tragwerkebestehen")
        let text = '';
        for (let k = 0; k < entries.length; k++) {
          const s = entries[k].item.str;
          if (k === 0) { text = s; continue; }
          if (text.length && !text.endsWith(' ') && s.length && !s.startsWith(' ')) {
            const xGap =
              entries[k].item.transform[4] -
              (entries[k - 1].item.transform[4] + (entries[k - 1].item.width || 0));
            text += (xGap > 1 ? ' ' : '') + s;
          } else {
            text += s;
          }
        }
        text = text.trim();

        // isEncoded: maxCount≥2 bedeutet dieser Text war N-fach im Original (AKAD-Encoding)
        const maxCount = Math.max(...entries.map((e) => e.count));
        let isEncoded = false;
        let deduped = text;
        if (maxCount >= 2) {
          const firstStr = entries[0].item.str.trim();
          if (firstStr && entries.every((e) => e.item.str.trim() === firstStr)) {
            isEncoded = true;
            deduped = firstStr;
          }
        }

        return { y, text, deduped, isEncoded } as LineItem;
      });

    allLines.push(...sortedLines);
  }

  return allLines;
}

/**
 * Sicherheitsnetz: Bereinigt doppelt vorkommenden Text.
 * Schicht 3 nach Bounding-Box-Dedup (Schicht 1) und isEncoded-Erkennung (Schicht 2).
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
    const recent = deduped.slice(-3).map((l) => l.trim());
    if (!t || !recent.includes(t)) {
      deduped.push(line);
    }
  }

  return deduped.join('\n').trim();
}

/** Baut Kapitel-Struktur aus den extrahierten Zeilen */
function buildChapters(lines: LineItem[], filename: string) {
  const chapters: any[] = [];
  let currentTitle = 'Einleitung';
  let currentLines: string[] = [];
  let chapterNum = 0;
  let pendingNumber: string | null = null;
  let pendingNumberY: number | null = null;

  const chapterHeadingRe =
    /^(\d+(?:\.\d+)*\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,\/\-(]{3,80}|Einleitung(?:\s*(?:und|\/)\s*Lernziele)?|Zusammenfassung|Lernziele|Vorwort|Literaturverzeichnis|Antworten zu den Kontrollfragen)$/;

  const flush = () => {
    if (currentLines.length === 0) return;
    chapterNum++;
    const body = sanitizeText(currentLines.join('\n'));
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
    currentLines = [];
  };

  for (const line of lines) {
    const text = line.isEncoded ? line.deduped : line.text;
    const trimmed = text.trim();
    if (!trimmed) continue;

    // Kapitel-/Abschnittsnummer VOR length-Filter ("1" hat length=1)
    if (line.isEncoded && /^\d+(?:\.\d+)*$/.test(trimmed)) {
      pendingNumber = trimmed;
      pendingNumberY = line.y;
      continue;
    }
    if (trimmed.length < 2) continue;

    let isHeading = false;
    let headingTitle = trimmed;

    if (pendingNumber !== null && pendingNumberY !== null) {
      const combined = `${pendingNumber} ${trimmed}`;
      const yGap = pendingNumberY - line.y;
      if (line.isEncoded && chapterHeadingRe.test(combined) && yGap < 40) {
        headingTitle = combined;
        isHeading = true;
      }
      pendingNumber = null;
      pendingNumberY = null;
    }

    if (!isHeading && line.isEncoded && chapterHeadingRe.test(trimmed)) {
      isHeading = true;
    }

    if (isHeading) {
      flush();
      currentTitle = headingTitle;
      currentLines = [];
    } else if (trimmed.length > 2) {
      currentLines.push(trimmed);
    }
  }

  flush();

  // Fallback: wenn keine Kapitel erkannt → nach Wortanzahl splitten
  if (chapters.length <= 1) {
    const words = lines
      .map((l) => (l.isEncoded ? l.deduped : l.text))
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);
    const chunkSize = 1500;
    const result: any[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      const num = Math.floor(i / chunkSize) + 1;
      result.push({
        id: generateId(),
        chapter_num: num,
        title: `Teil ${num}`,
        cleaned_text: chunk,
        word_count: words.slice(i, i + chunkSize).length,
        duration_seconds: Math.round(words.slice(i, i + chunkSize).length / 2.5),
        audio_path: null,
        audio_status: 'pending',
        created_at: new Date().toISOString(),
      });
    }
    return result;
  }

  return chapters;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei angegeben. Bitte eine PDF-Datei hochladen.', success: false },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: `Ungültiger Dateityp "${file.type || 'unbekannt'}". Nur PDF-Dateien werden unterstützt.`, success: false },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `Datei zu groß (${sizeMB} MB). Maximale Dateigröße: ${MAX_FILE_SIZE_MB} MB.`, success: false },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Die hochgeladene Datei ist leer.', success: false },
        { status: 400 }
      );
    }

    // ── Extraction ──────────────────────────────────────────────────────────
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      return NextResponse.json(
        { error: 'Datei konnte nicht gelesen werden. Bitte erneut versuchen.', success: false },
        { status: 400 }
      );
    }

    // Basic PDF header check (%PDF-)
    if (buffer.length < 5 || buffer.toString('ascii', 0, 5) !== '%PDF-') {
      return NextResponse.json(
        { error: 'Die Datei ist keine gültige PDF (fehlendes %PDF-Header). Möglicherweise beschädigt.', success: false },
        { status: 400 }
      );
    }

    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    let lines: Awaited<ReturnType<typeof extractPDFLayout>>;
    try {
      lines = await extractPDFLayout(uint8);
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      console.error(`[UPLOAD] Extraction failed for "${file.name}": ${msg}`);
      return NextResponse.json(
        { error: `Textextraktion fehlgeschlagen: ${msg}. Das PDF könnte passwortgeschützt oder beschädigt sein.`, success: false },
        { status: 422 }
      );
    }

    if (!lines.length) {
      return NextResponse.json(
        { error: 'Kein Text in der PDF gefunden. Das Dokument könnte gescannt/bildbasiert sein und enthält keinen extrahierbaren Text.', success: false },
        { status: 422 }
      );
    }

    // ── Build result ────────────────────────────────────────────────────────
    const documentId = generateId();
    const chaptersRaw = buildChapters(lines, file.name);
    const chapters = chaptersRaw.map((ch) => ({ ...ch, document_id: documentId }));
    const totalWords = chapters.reduce((sum, ch) => sum + ch.word_count, 0);

    const document = {
      id: documentId,
      filename: file.name,
      chapters_count: chapters.length,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'ready',
      extraction: `${totalWords} Wörter, ${chapters.length} Kapitel`,
    };

    console.log(`[UPLOAD v1.0.0] "${file.name}" → ${chapters.length} Kapitel, ${totalWords} Wörter`);

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
      { success: false, error: 'Interner Serverfehler beim Upload. Bitte erneut versuchen.', details: errorMsg },
      { status: 500 }
    );
  }
}
