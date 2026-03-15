/**
 * Client-side PDF Extraction via pdfjs-dist
 * Läuft im Browser — kein Server nötig.
 */

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function cleanText(text: string): string {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l || l.length < 2) return false;
      if (/^-?\s*\d+\s*-?$/.test(l)) return false;
      if (/^Seite\s+\d+/i.test(l)) return false;
      return true;
    })
    .join('\n');
}

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
        const wordCount = body.split(/\s+/).length;
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
      document_id: docId,
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

  // Fallback: nach Wortanzahl splitten
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
        document_id: docId,
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

export async function extractPDF(file: File): Promise<{
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

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  const cleanedText = cleanText(fullText);
  const docId = generateId();
  const chapters = splitIntoChapters(cleanedText, file.name, docId);

  const document = {
    id: docId,
    filename: file.name,
    chapters_count: chapters.length,
    progress: 0,
    last_accessed: new Date().toISOString(),
    created_at: new Date().toISOString(),
    status: 'ready',
    extraction: `${pdf.numPages} Seiten, ${cleanedText.length} Zeichen, ${chapters.length} Kapitel`
  };

  return { document, chapters };
}
