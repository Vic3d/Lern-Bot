import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';

// PDF.js direkt — gibt uns Position + strukturelle Wiederholungs-Erkennung
// unpdf wird nicht mehr verwendet (concateniert Items ohne Positionsdaten)
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Worker-Pfad: createRequire + require.resolve ist robust auf Vercel Serverless
// (process.cwd() zeigt dort ggf. woanders hin)
const _require = createRequire(import.meta.url);
const workerPath = _require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

interface LineItem {
  y: number;
  text: string;       // zusammengefügter Text aller Items in dieser Zeile
  deduped: string;    // dedupliziert wenn Encoding erkannt
  isEncoded: boolean; // true = N≥2 gleiche Items = AKAD-Encoding
}

/**
 * Extrahiert Text aus PDF mit positionsbasierter Header/Footer-Erkennung.
 * Nutzt PDF.js direkt statt unpdf → Zugriff auf x/y/fontHeight pro Item.
 * AKAD-Encoding (4x wiederholte Items) wird strukturell erkannt, nicht per Regex.
 */
/**
 * Bounding-Box-Deduplication: entfernt redundante Text-Items die an (nahezu) gleicher
 * Position gedruckt wurden (z.B. AKAD 4x-Encoding, Bold-Pseudo-Effekte).
 * Logik: Item A ist Duplikat von B wenn:
 *   - gleicher Text (nach trim)  UND
 *   - Mittelpunkte liegen ≤ 4pt auseinander (Overlap ohne width/height zu brauchen)
 * Behält immer das ERSTE Vorkommen.
 */
function deduplicateItems(items: any[]): any[] {
  const kept: any[] = [];
  for (const item of items) {
    const str = item.str.trim();
    const x = item.transform[4];
    const y = item.transform[5];
    const isDuplicate = kept.some((k) => {
      if (k.str.trim() !== str) return false;
      return Math.abs(k.transform[4] - x) <= 4 && Math.abs(k.transform[5] - y) <= 4;
    });
    if (!isDuplicate) kept.push(item);
  }
  return kept;
}

async function extractPDFLayout(buffer: Uint8Array): Promise<LineItem[]> {
  const doc = await getDocument({
    data: buffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const allLines: LineItem[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height; // A4 ≈ 842pt

    const textContent = await page.getTextContent();

    // Header-Zone (oben): y > 92% der Seitenhöhe  →  Seitenzahl
    // Footer-Zone (unten): y < 8% der Seitenhöhe  →  "Kapitel N", "å TME102"
    const HEADER_Y = pageHeight * 0.92;
    const FOOTER_Y = pageHeight * 0.08;

    // Schritt 1: Items auf Inhaltsbereich reduzieren
    // WICHTIG: deduplicateItems wird NICHT hier angewandt — die isEncoded-Erkennung
    // in Schritt 3 braucht die N>=2 identischen Items um Überschriften zu erkennen.
    // sanitizeText() am Ende fängt verbleibende Duplikate im Body-Text auf.
    const contentItems = (textContent.items as any[]).filter(
      (item) => item.str?.trim() && item.transform[5] > FOOTER_Y && item.transform[5] < HEADER_Y
    );

    // Schritt 2: Items nach y-Position gruppieren (±3pt = gleiche Zeile)
    const yMap = new Map<number, any[]>();
    for (const item of contentItems) {
      const y = Math.round(item.transform[5]);
      let matched = false;
      for (const [gy] of yMap) {
        if (Math.abs(gy - y) <= 3) {
          yMap.get(gy)!.push(item);
          matched = true;
          break;
        }
      }
      if (!matched) yMap.set(y, [item]);
    }

    // Schritt 3: Zeilen sortieren (y absteigend = oben nach unten)
    const sortedLines = [...yMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => {
        // Items innerhalb der Zeile nach x sortieren
        items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
        // Leerzeichen zwischen Items einfügen wenn nötig (verhindert "Tragwerkebestehen")
        let text = '';
        for (let k = 0; k < items.length; k++) {
          const s = items[k].str;
          if (k === 0) { text = s; continue; }
          const prev = text;
          // Space einfügen wenn letztes Zeichen kein Space und nächstes auch nicht
          if (prev.length && !prev.endsWith(' ') && s.length && !s.startsWith(' ')) {
            // Nur wenn x-Abstand > 1pt (echte Lücke, kein Overlap)
            const xGap = items[k].transform[4] - (items[k - 1].transform[4] + (items[k - 1].width || 0));
            text += (xGap > 1 ? ' ' : '') + s;
          } else {
            text += s;
          }
        }
        text = text.trim();

        // AKAD-Encoding-Erkennung: N≥2 identische Items
        let isEncoded = false;
        let deduped = text;
        if (items.length >= 2) {
          const firstStr = items[0].str.trim();
          if (firstStr && items.every((i: any) => i.str.trim() === firstStr)) {
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
 * Sicherheitsnetz: Bereinigt doppelt vorkommenden Text aus dem extrahierten Inhalt.
 * Wird NACH der Extraktion auf jedes cleaned_text angewendet.
 *
 * Behandelt zwei Fälle:
 * 1. Inline-Wiederholungen: "TitelTitelTitelTitel" → "Titel"  (AKAD 4x-Encoding)
 * 2. Zeilen-Wiederholungen: gleiche Zeile N≥2 mal hintereinander → 1x behalten
 *
 * Andere Screen-Reader (Speechify, Natural Reader) machen exakt das als Post-Processing.
 */
function sanitizeText(text: string): string {
  if (!text) return text;

  // Schritt 1: Inline-Wiederholungen (z.B. "WortWortWortWort" → "Wort")
  // Findet Phrasen die 2–6x direkt hintereinander vorkommen
  let cleaned = text.replace(/(.{4,}?)\1{2,}/g, '$1');

  // Schritt 2: Zeilen-Wiederholungen (gleiche Zeile hintereinander)
  const lines = cleaned.split('\n');
  const deduped: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    // Überspringe wenn die letzten 1-3 Zeilen identisch sind (Schwelle: ≥2 gleich = streichen)
    const recent = deduped.slice(-3).map(l => l.trim());
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

  // Überschrift-Pattern: "1 Titel", "1.2 Titel", oder bekannte Sektionsnamen
  const chapterHeadingRe = /^(\d+(?:\.\d+)*\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,\/\-()]{2,80}|Einleitung(?:\s*(?:und|\/)\s*Lernziele)?|Zusammenfassung|Lernziele|Vorwort|Literaturverzeichnis|Stichwortverzeichnis|Antworten zu den Kontrollfragen)$/;

  const flush = () => {
    if (currentLines.length === 0) return;
    chapterNum++;
    // sanitizeText als Sicherheitsnetz: fängt doppelten Text auch wenn PDF.js-Erkennung nicht greift
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

    // Kapitel-/Abschnittsnummer aus encoded Line (z.B. "1", "1.2", "1.4.3")
    // WICHTIG: Nummern können einstellig sein ("1"), nicht filtern!
    if (line.isEncoded && /^\d+(?:\.\d+)*$/.test(trimmed)) {
      pendingNumber = trimmed;
      pendingNumberY = line.y;
      continue;
    }

    // Erst nach Nummer-Check für Längenfil filter apply
    if (trimmed.length < 2) continue;

    let isHeading = false;
    let headingTitle = trimmed;

    // Encoded Nummer + encoded Titel = Überschrift
    if (pendingNumber !== null && pendingNumberY !== null) {
      const combined = `${pendingNumber} ${trimmed}`;
      // FIX: y-Abstand muss klein sein (echter Kapitelheader vs. Diagramm-Label weit entfernt)
      // Echte Kapitel-Überschriften haben Nummer und Titel nah beieinander (≤40pt)
      const yGap = pendingNumberY - line.y;
      if (line.isEncoded && chapterHeadingRe.test(combined) && yGap < 40) {
        headingTitle = combined;
        isHeading = true;
      }
      pendingNumber = null;
      pendingNumberY = null;
    }

    // Direkte Überschriften-Erkennung für encoded Zeilen (z.B. "Zusammenfassung" 4x)
    if (!isHeading && line.isEncoded && chapterHeadingRe.test(trimmed)) {
      isHeading = true;
    }

    if (isHeading) {
      flush();
      currentTitle = headingTitle;
      currentLines = [];
    } else {
      // Body-Text: nur wenn sinnvoll lang
      if (trimmed.length > 2) {
        currentLines.push(trimmed);
      }
    }
  }

  flush();

  // Fallback: falls nur 1 Kapitel erkannt → nach Wortanzahl splitten
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided', success: false }, { status: 400 });
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported', success: false }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // PDF.js Extraktion mit Positionsdaten
    const lines = await extractPDFLayout(uint8);
    const documentId = generateId();
    const chaptersRaw = buildChapters(lines, file.name);

    const chapters = chaptersRaw.map((ch) => ({
      ...ch,
      document_id: documentId,
    }));

    const totalWords = chapters.reduce((sum, ch) => sum + ch.word_count, 0);
    const totalPages = Math.ceil(lines.length / 15); // Rough estimate

    const document = {
      id: documentId,
      filename: file.name,
      chapters_count: chapters.length,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'ready',
      extraction: `~${totalPages} Seiten, ${totalWords} Wörter, ${chapters.length} Kapitel`,
    };

    console.log(`[UPLOAD] "${file.name}" → ${chapters.length} Kapitel, ${totalWords} Wörter`);

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
