import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'crypto';

// Simple UUID for MVP
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDF file required' },
        { status: 400 }
      );
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save PDF file
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${generateId()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Extract PDF
    const scriptPath = path.join(process.cwd(), 'scripts', 'extract_pdf.py');
    let extractResult: any;
    
    try {
      const output = execSync(`python3 "${scriptPath}" "${filePath}"`, {
        encoding: 'utf-8',
        timeout: 30000
      });
      extractResult = JSON.parse(output);
    } catch (error) {
      console.error('PDF extraction error:', error);
      extractResult = {
        success: false,
        error: 'Could not extract PDF',
        chapters: [
          {
            chapter_num: 1,
            title: 'Chapter 1',
            cleaned_text: 'PDF content could not be extracted. Please try another file.',
            word_count: 50
          }
        ]
      };
    }

    // Save document to DB
    const documentId = generateId();
    const document = {
      id: documentId,
      filename: file.name,
      pdf_path: filePath,
      chapters_count: extractResult.chapters?.length || 1,
      progress: 0,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const dbPath = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    const docsFile = path.join(dbPath, 'documents.json');
    let docs = [];
    if (fs.existsSync(docsFile)) {
      docs = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
    }
    docs.push(document);
    fs.writeFileSync(docsFile, JSON.stringify(docs, null, 2));

    // Save chapters to DB
    const chaptersFile = path.join(dbPath, 'chapters.json');
    let allChapters = [];
    if (fs.existsSync(chaptersFile)) {
      allChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
    }

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Create chapters and generate audio
    if (extractResult.chapters) {
      for (const chapterData of extractResult.chapters) {
        const chapterId = generateId();
        const audioFileName = `${chapterId}.mp3`;
        const audioPath = path.join(audioDir, audioFileName);

        // Generate audio
        try {
          const ttsScript = path.join(process.cwd(), 'scripts', 'generate_tts.py');
          // Escape text for shell
          const escapedText = chapterData.cleaned_text.substring(0, 500).replace(/"/g, '\\"');
          execSync(`python3 "${ttsScript}" "${escapedText}" "${audioPath}"`, {
            encoding: 'utf-8',
            timeout: 60000,
            stdio: 'pipe'
          });
        } catch (error) {
          console.error('TTS generation error:', error);
          // Continue without audio for now
        }

        const chapter = {
          id: chapterId,
          document_id: documentId,
          chapter_num: chapterData.chapter_num,
          title: chapterData.title,
          cleaned_text: chapterData.cleaned_text,
          audio_path: `/audio/${audioFileName}`,
          duration_seconds: Math.ceil((chapterData.word_count || 100) / 2.5),
          created_at: new Date().toISOString()
        };

        allChapters.push(chapter);
      }
    }

    fs.writeFileSync(chaptersFile, JSON.stringify(allChapters, null, 2));

    return NextResponse.json({
      document,
      chapters: extractResult.chapters?.length || 0,
      status: 'success'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: String(error) },
      { status: 500 }
    );
  }
}
