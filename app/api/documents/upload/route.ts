import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
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

    console.log(`[UPLOAD] Starting upload of ${file.name}`);

    const isVercel = process.env.VERCEL === '1';
    const baseDir = isVercel ? '/tmp' : process.cwd();
    const uploadsDir = path.join(baseDir, 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${generateId()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`[UPLOAD] PDF saved: ${filePath} (${buffer.length} bytes)`);

    // --- PDF extraction via pdfplumber Python script ---
    const scriptPath = path.join(process.cwd(), 'scripts', 'extract_pdf.py');
    let pythonResult: any = null;
    let extractionNote = '';

    try {
      const output = execSync(`python3 "${scriptPath}" "${filePath}"`, {
        timeout: 120000,
        maxBuffer: 50 * 1024 * 1024, // 50 MB
      }).toString();

      pythonResult = JSON.parse(output);

      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Python extraction returned success=false');
      }

      extractionNote = `Extracted ${pythonResult.pages} pages, ${pythonResult.total_chars} chars, ${pythonResult.chapters_count} chapters`;
      console.log(`[UPLOAD] PDF extracted: ${extractionNote}`);
    } catch (e) {
      console.warn(`[UPLOAD] PDF extraction via pdfplumber failed: ${e}`);
      // Fallback: single "chapter" with error message
      pythonResult = null;
      extractionNote = 'extraction failed, using fallback';
    }

    const documentId = generateId();
    let chapters: any[];

    if (pythonResult && pythonResult.chapters && pythonResult.chapters.length > 0) {
      // Map Python chapters to DB schema
      chapters = pythonResult.chapters.map((ch: any) => ({
        id: generateId(),
        document_id: documentId,
        chapter_num: ch.chapter_num,
        title: ch.title,
        cleaned_text: ch.text,
        audio_path: null,
        audio_status: 'pending',
        duration_seconds: ch.duration_seconds || 0,
        word_count: ch.word_count || 0,
        created_at: new Date().toISOString(),
      }));
    } else {
      // Fallback chapter
      chapters = [
        {
          id: generateId(),
          document_id: documentId,
          chapter_num: 1,
          title: file.name,
          cleaned_text: `Inhalt aus ${file.name} konnte nicht automatisch extrahiert werden. Bitte stelle sicher, dass das PDF keine Scan-Grafiken enthält. Für beste Ergebnisse: digitale PDFs hochladen (kein Scan).`,
          audio_path: null,
          audio_status: 'pending',
          duration_seconds: 0,
          word_count: 0,
          created_at: new Date().toISOString(),
        },
      ];
    }

    const document = {
      id: documentId,
      filename: file.name,
      chapters_count: chapters.length,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'ready',
    };

    const dataDir = path.join(baseDir, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const docsFile = path.join(dataDir, 'documents.json');
    let docs: any[] = [];
    try {
      if (fs.existsSync(docsFile)) {
        docs = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
      }
    } catch {}
    docs.push(document);
    fs.writeFileSync(docsFile, JSON.stringify(docs, null, 2));

    const chaptersFile = path.join(dataDir, 'chapters.json');
    let allChapters: any[] = [];
    try {
      if (fs.existsSync(chaptersFile)) {
        allChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
      }
    } catch {}
    allChapters.push(...chapters);
    fs.writeFileSync(chaptersFile, JSON.stringify(allChapters, null, 2));
    console.log(`[UPLOAD] Saved ${chapters.length} chapters for doc ${documentId}`);

    return NextResponse.json({
      success: true,
      document,
      chapters: chapters.length,
      extraction: extractionNote,
      message: `PDF "${file.name}" hochgeladen. ${chapters.length} Kapitel extrahiert.`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[UPLOAD ERROR] ${errorMsg}`);
    return NextResponse.json(
      { success: false, error: 'Upload failed', details: errorMsg, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
