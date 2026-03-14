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

    console.log(`[UPLOAD] Starting upload of ${file.name}`);

    // Use /tmp on Vercel, regular directory on localhost
    const isVercel = process.env.VERCEL === '1';
    const baseDir = isVercel ? '/tmp' : process.cwd();
    const uploadsDir = path.join(baseDir, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`[UPLOAD] Created directory: ${uploadsDir}`);
    }

    // Save PDF file
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${generateId()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, buffer);
    console.log(`[UPLOAD] PDF saved to ${filePath}, size: ${buffer.length} bytes`);

    // Create mock chapters for now (PDF extraction will come later)
    const documentId = generateId();
    const document = {
      id: documentId,
      filename: file.name,
      chapters_count: 3,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'ready'
    };

    const dataDir = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save document
    const docsFile = path.join(dataDir, 'documents.json');
    let docs = [];
    try {
      if (fs.existsSync(docsFile)) {
        docs = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
      }
    } catch (e) {
      console.log('[UPLOAD] Starting fresh documents.json');
    }
    
    docs.push(document);
    fs.writeFileSync(docsFile, JSON.stringify(docs, null, 2));
    console.log(`[UPLOAD] Document saved: ${documentId}`);

    // Create mock chapters
    const chapters = [];
    const sampleText = `This is a sample chapter from ${file.name}. 
PDF extraction is being prepared. For now, you can read this placeholder text. 
In the next version, we'll extract actual content from your PDF and generate audio.`;

    for (let i = 1; i <= 3; i++) {
      const chapterId = generateId();
      const chapter = {
        id: chapterId,
        document_id: documentId,
        chapter_num: i,
        title: `Chapter ${i}: ${file.name}`,
        cleaned_text: sampleText,
        audio_path: null,
        audio_status: 'pending',
        duration_seconds: 120,
        created_at: new Date().toISOString()
      };
      chapters.push(chapter);
    }

    // Save chapters
    const chaptersFile = path.join(dataDir, 'chapters.json');
    let allChapters = [];
    try {
      if (fs.existsSync(chaptersFile)) {
        allChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
      }
    } catch (e) {
      console.log('[UPLOAD] Starting fresh chapters.json');
    }

    allChapters.push(...chapters);
    fs.writeFileSync(chaptersFile, JSON.stringify(allChapters, null, 2));
    console.log(`[UPLOAD] Saved ${chapters.length} chapters`);

    return NextResponse.json({
      success: true,
      document,
      chapters: chapters.length,
      message: `PDF "${file.name}" uploaded successfully. Chapters created.`
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[UPLOAD ERROR] ${errorMsg}`);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: errorMsg,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
