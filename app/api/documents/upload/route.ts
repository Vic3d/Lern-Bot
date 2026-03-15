import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

/** Erkennt laufende Kopf-/Fußzeilen: Zeilen die ≥5x identisch vorkommen und ≤8 Wörter lang sind */
function detectRunningHeaders(lines: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const l of lines) {
    const t = l.trim();
    if (t.length >= 2 && t.split(/\s+/).length <= 8) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  const headers = new Set<string>();
  for (const [line, count] of counts) {
    if (count >= 5) headers.add(line);
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
      if (/^-?\s*\d{1,3}\s*-?$/.test(l)) return false;
      if (/^(Seite|Page)\s+\d+/i.test(l)) return false;
      // Modul-Codes (z.B. TME102, BWL101)
      if (/^[A-Z]{2,6}\d{2,4}$/.test(l)) return false;
      // Autorenzeilen in Fußzeile
      if (/^Prof\.\s+Dr\./i.test(l)) return false;
      if (/^Dr\.\s+[A-ZÄÖÜ]/.test(l) && l.length < 60) return false;
      // Copyright-Zeilen
      if (/^[©®]|^Copyright/i.test(l)) return false;
      // Laufende Kopf-/Fußzeilen (wiederkehrend)
      if (runningHeaders.has(l)) return false;
      return true;
    })
    .join('\n');
}

function splitIntoChapters(text: string, filename: string) {
  // Überschrift: beginnt mit Zahl + Großbuchstabe, endet NICHT auf Seitenzahl (kein TOC-Eintrag)
  const headingPattern = /^(\d+[\.\d]*\s+[A-ZÄÖÜ][^\n]{3,80}|Einleitung(?:\s*(?:und|\/)\s*Lernziele)?|Zusammenfassung|Lernziele)$/;
  const lines = text.split('\n');
  const chapters: any[] = [];
  let currentTitle = 'Einleitung';
  let currentLines: string[] = [];
  let chapterNum = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // TOC-Einträge ausschließen: Überschrift-Pattern aber endet auf Leerzeichen + Zahl (Seitenangabe)
    const isTocEntry = /\s\d{1,3}$/.test(trimmed) && /^\d/.test(trimmed);
    if (headingPattern.test(trimmed) && !isTocEntry && currentLines.join('').length > 300) {
      if (currentLines.length > 0) {
        chapterNum++;
        const body = currentLines.join('\n').trim();
        const wordCount = body.split(/\s+/).length;
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
      }
      currentTitle = trimmed;
      currentLines = [];
    } else {
      currentLines.push(trimmed);
    }
  }

  if (currentLines.length > 0) {
    chapterNum++;
    const body = currentLines.join('\n').trim();
    const wordCount = body.split(/\s+/).length;
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
  }

  // Fallback: zu wenig Kapitel → nach Wortanzahl splitten
  if (chapters.length <= 1) {
    const words = text.split(/\s+/);
    const chunkSize = 1500;
    const result: any[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      const num = Math.floor(i / chunkSize) + 1;
      const wordCount = words.slice(i, i + chunkSize).length;
      result.push({
        id: generateId(),
        chapter_num: num,
        title: `${filename} — Teil ${num}`,
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
    const { text, totalPages } = await extractText(uint8, { mergePages: true });

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
