import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Dekodiert 4x/2x-wiederholte Zeichenfolgen (AKAD-PDF-Encoding).
 * "Statik ebener TragwerkeStatik ebener Tragwerke..." → "Statik ebener Tragwerke"
 * "1111" → "1"
 */
function decodeRepeated(line: string): string {
  // Schritt 1: 4x wiederholte Einzelzeichen → 1x (behandelt "1111"→"1", "SSSStttt"→"St")
  // WICHTIG: (.)\1{2,} = selbes Zeichen mind. 3x in Folge ("1111"\u2192"1")
  let current = line.trim().replace(/(.)\1{2,}/g, '$1');
  // Schritt 2: Wort-Level-Repetition → erste Instanz ("TitelTitelTitel"→"Titel")
  for (let iter = 0; iter < 4; iter++) {
    const n = current.length;
    let found = false;
    for (let unitLen = 2; unitLen <= Math.floor(n / 2); unitLen++) {
      const unit = current.substring(0, unitLen);
      if (current.startsWith(unit + unit)) {
        current = unit.trim();
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return current;
}

/** Prüft ob eine Zeile ein wiederholtes Encoding hat (mind. 2× selber Prefix) */
function isRepeatedLine(line: string): boolean {
  // 4x Einzelzeichen-Repetition (z.B. "1111", "SSSStttt") — immer erkennen
  if (/(.)\1{3}/.test(line)) return true;
  // Phrase-Repetition (z.B. "TitelTitelTitel") — min. 4 Zeichen um false positives zu vermeiden
  // (verhindert z.B. "ge" in "gegensetzt" als false positive)
  const n = line.length;
  if (n < 8) return false;
  for (let unitLen = 4; unitLen <= Math.floor(n / 2); unitLen++) {
    const unit = line.substring(0, unitLen);
    if (line.startsWith(unit + unit)) return true;
  }
  return false;
}

/**
 * Bereinigt Text per-page: entfernt bekannte AKAD-Header-Zeilen (Seitenzahl, "Kapitel N", "å TME102")
 * aus den ersten 3 Zeilen jeder Seite. Globale Filter für Copyright etc.
 * KEIN globales Zählen — verhindert falsche Filterung von Mechanik-Variablen (F1, S1, CH, CV).
 */
function cleanTextPerPage(pages: string[]): string {
  return pages.map(pageText => {
    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
    const result: string[] = [];
    let headerZone = true;
    let headerCount = 0;

    // Seiten ohne echten Lehrinhalt komplett überspringen:
    // Inhaltsverzeichnis-, Impressum- und Cover-Seiten
    const nonPageLines = lines.filter(l => !/^-?\s*\d{1,3}\s*-?$/.test(l));
    const firstContent = nonPageLines[0] || '';
    // Cover-Seite (beginnt mit "Statik"), Inhaltsverzeichnis, Impressum → überspringen
    if (/^(Inhaltsverzeichnis|Impressum|Studienmaterial|Statik)$/i.test(firstContent)) return '';

    for (const line of lines) {
      // In der Header-Zone (max. 4 Zeilen) bekannte AKAD-Muster entfernen
      if (headerZone && headerCount < 4) {
        // BUG-FIX: nur 1-3 Ziffern als Seitenzahl — "1111" (4x kodierte "1") darf NICHT gefiltert werden!
        if (/^-?\s*\d{1,3}\s*-?$/.test(line)) { headerCount++; continue; }   // Seitenzahl ≤ 999
        if (/^Kapitel\s+\d+$/i.test(line)) { headerCount++; continue; }       // "Kapitel 1"
        if (/^[A-Z]{2,6}\d{2,4}$/.test(line)) { headerCount++; continue; }   // "TME102"
        // Erste echte Inhaltszeile → Header-Zone verlassen
        headerZone = false;
      }

      // Globale Filter (gelten überall, auch außerhalb Header-Zone)
      if (/^å/.test(line)) continue;                                           // "å TME102" überall
      if (/^(Einleitung\/Lernziele|Kapitel\s+\d+)$/i.test(line)) continue;    // laufende Abschnittsheader
      if (/^Prof\.\s+Dr\./i.test(line)) continue;
      if (/^Dr\.\s+[A-ZÄÖÜ]/.test(line) && line.length < 60) continue;
      if (/^[©®]|^Copyright/i.test(line)) continue;
      if (/^Art\.-Nr\./.test(line)) continue;
      if (/^K\d{4}$/.test(line)) continue;
      // TOC-Einträge: "1.1 Titel 5" oder "Zusammenfassung 50" — enden auf Seitenzahl
      if (/\s\d{1,3}$/.test(line) && /^(\d+(?:\.\d+)*\s+|[A-ZÄÖÜ][a-z].*\s)/.test(line)) continue;

      result.push(line);
    }
    return result.join('\n');
  }).join('\n');
}

function splitIntoChapters(text: string, filename: string) {
  const lines = text.split('\n');
  const chapters: any[] = [];
  let currentTitle = 'Einleitung';
  let currentLines: string[] = [];
  let chapterNum = 0;
  let pendingNumber: string | null = null;  // Wartende Kapitelnummer (z.B. "1")

  // Heading-Pattern (nach Dekodierung)
  const chapterHeadingRe = /^(\d+(?:\.\d+)*\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,\/\-]{3,80}|Einleitung(?:\s*(?:und|\/)\s*Lernziele)?|Zusammenfassung|Lernziele|Vorwort|Literaturverzeichnis|Stichwortverzeichnis|Antworten zu den Kontrollfragen)$/;
  // TOC-Einträge: enden auf Seitenzahl
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
      created_at: new Date().toISOString()
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Dekodiere wiederholte Zeilen (AKAD 4x-Encoding)
    const decoded = isRepeatedLine(trimmed) ? decodeRepeated(trimmed) : trimmed;

    // Kapitelnummer (z.B. "1" aus "1111", oder "1.2" aus "1.21.21.21.2")
    if (/^\d+(?:\.\d+)*$/.test(decoded) && isRepeatedLine(trimmed)) {
      pendingNumber = decoded;
      continue;
    }

    // Überschrift-Erkennung
    let isHeading = false;
    let headingTitle = decoded;

    if (pendingNumber !== null) {
      // Kombiniere Nummer + Titel
      const combined = `${pendingNumber} ${decoded}`;
      if (chapterHeadingRe.test(combined) && !isTocEntry(combined)) {
        headingTitle = combined;
        isHeading = true;
      }
      pendingNumber = null;
    }

    if (!isHeading && chapterHeadingRe.test(decoded) && !isTocEntry(decoded)) {
      isHeading = true;
      headingTitle = decoded;
    }

    if (isHeading) {
      // Immer flushen wenn Inhalt vorhanden — nie als Body-Text hinzufügen
      if (currentLines.length > 0 || chapters.length > 0) {
        flush();
      }
      currentTitle = headingTitle;
      currentLines = [];
    } else {
      // Body-Text: nur dekodierte Version einfügen wenn sinnvoll
      const bodyText = isRepeatedLine(trimmed) ? decoded : trimmed;
      // Sehr kurze dekodierte Reste (z.B. "ge" aus false positive) überspringen
      if (bodyText.length > 3) {
        currentLines.push(bodyText);
      }
    }
  }

  flush();

  // Fallback: zu wenig Kapitel → nach Wortanzahl splitten
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
        chapter_num: num,
        title: `Teil ${num}`,
        cleaned_text: chunk,
        word_count: wordCount,
        duration_seconds: Math.round(wordCount / 2.5),
        audio_path: null,
        audio_status: 'pending',
        created_at: new Date().toISOString()
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

    // PDF-Extraktion via unpdf (Vercel + Node.js kompatibel, kein Worker nötig)
    // mergePages: false → Array pro Seite → per-page Header-Stripping möglich
    const { text: textRaw, totalPages } = await extractText(uint8, { mergePages: false });
    const pages: string[] = Array.isArray(textRaw) ? (textRaw as string[]) : [(textRaw as string)];

    const cleanedText = cleanTextPerPage(pages);
    const documentId = generateId();
    const chaptersRaw = splitIntoChapters(cleanedText, file.name);

    const chapters = chaptersRaw.map(ch => ({
      ...ch,
      document_id: documentId
    }));

    const document = {
      id: documentId,
      filename: file.name,
      chapters_count: chapters.length,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'ready',
      extraction: `${totalPages} Seiten, ${cleanedText.length} Zeichen, ${chapters.length} Kapitel`
    };

    console.log(`[UPLOAD] "${file.name}" → ${chapters.length} Kapitel, ${totalPages} Seiten`);

    return NextResponse.json({
      success: true,
      document,
      chapters,
      message: `"${file.name}" hochgeladen — ${chapters.length} Kapitel extrahiert.`
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
