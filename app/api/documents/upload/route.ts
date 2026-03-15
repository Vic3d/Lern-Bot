import { NextRequest, NextResponse } from 'next/server';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function cleanText(text: string): string {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l || l.length < 2) return false;
      if (/^-?\s*\d+\s*-?$/.test(l)) return false; // Seitenzahlen
      if (/^Seite\s+\d+/i.test(l)) return false;
      return true;
    })
    .join('\n');
}

function splitIntoChapters(text: string, filename: string) {
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

  // Fallback: wenn zu wenig Kapitel → nach Wortanzahl splitten
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

    // PDF-Extraktion via pdfjs-dist (reines JS, Vercel-kompatibel)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);
    const doc = await pdfjs.getDocument({ data: uint8 }).promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }

    const cleanedText = cleanText(fullText);
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
      extraction: `${doc.numPages} Seiten, ${cleanedText.length} Zeichen, ${chapters.length} Kapitel`
    };

    console.log(`[UPLOAD] "${file.name}" → ${chapters.length} Kapitel, ${doc.numPages} Seiten`);

    // Daten werden an den Client zurückgegeben — Client speichert in localStorage
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
