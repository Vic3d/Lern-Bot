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

/** Erkennt laufende Kopf-/Fußzeilen: Zeilen die ≥4x identisch vorkommen */
function detectRunningHeaders(lines: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const l of lines) {
    const t = l.trim();
    if (t.length >= 2 && t.split(/\s+/).length <= 10) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  const headers = new Set<string>();
  for (const [line, count] of counts) {
    if (count >= 4) headers.add(line);
  }
  return headers;
}

function cleanText(text: string): string {
  const rawLines = text.split('\n').map(l => l.trim());
  const runningHeaders = detectRunningHeaders(rawLines);

  return rawLines
    .filter(l => {
      if (!l || l.length < 2) return false;
      // Seitenzahlen
      if (/^-?\s*\d{1,4}\s*-?$/.test(l)) return false;
      if (/^(Seite|Page)\s+\d+/i.test(l)) return false;
      // Modul-Codes wie TME102, BWL101
      if (/^[A-Z]{2,6}\d{2,4}$/.test(l)) return false;
      // AKAD-Header: "Kapitel N" und "å TME102"-Muster
      if (/^Kapitel\s+\d+$/i.test(l)) return false;
      if (/^å/.test(l)) return false;  // å TME102, åTME102, å allein — alle Varianten
      if (/^[Å§†‡]$/.test(l)) return false;
      // Abschnittsname-Header wie "Einleitung/Lernziele" ohne weiteren Text
      if (/^(Einleitung\/Lernziele|Statik ebener Tragwerke|Ebene Fachwerke)$/.test(l)) return false;
      // Autorenzeilen
      if (/^Prof\.\s+Dr\./i.test(l)) return false;
      if (/^Dr\.\s+[A-ZÄÖÜ]/.test(l) && l.length < 60) return false;
      // Copyright
      if (/^[©®]|^Copyright/i.test(l)) return false;
      // Laufende Kopf-/Fußzeilen (wiederkehrend)
      if (runningHeaders.has(l)) return false;
      return true;
    })
    .join('\n');
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
    // mergePages: false gibt Array pro Seite → Zeilenstruktur bleibt erhalten (wichtig für Heading-Erkennung)
    const { text: textRaw, totalPages } = await extractText(uint8, { mergePages: false });
    const text = Array.isArray(textRaw) ? (textRaw as string[]).join('\n') : (textRaw as string);

    const cleanedText = cleanText(text);
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
