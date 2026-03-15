import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { isVercel, getAudioDir, readChapters, writeChapters } from '@/lib/storage';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isVercel()) {
    return NextResponse.json({
      success: false,
      vercel: true,
      error: 'Server-TTS ist auf Vercel nicht verfügbar.',
      hint: 'Nutze die Browser-Sprachausgabe im Player.'
    }, { status: 503 });
  }

  try {
    let allChapters = readChapters();
    const docChapters = allChapters.filter((ch: any) => ch.document_id === params.id);

    if (docChapters.length === 0) {
      return NextResponse.json({ error: 'No chapters for this document' }, { status: 404 });
    }

    const audioDir = getAudioDir();
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_tts.py');
    const results: any[] = [];

    for (const chapter of docChapters) {
      if (chapter.audio_path) {
        const audioFile = path.join(process.cwd(), 'public', chapter.audio_path.replace(/^\//, ''));
        if (fs.existsSync(audioFile)) {
          results.push({ id: chapter.id, title: chapter.title, status: 'cached' });
          continue;
        }
      }

      try {
        console.log(`[TTS] "${chapter.title}" (${chapter.word_count || '?'} words)`);
        const input = JSON.stringify({
          chapter_id: `chapter-${chapter.id}`,
          text: chapter.cleaned_text,
          output_dir: audioDir
        });
        const output = execFileSync('python3', [scriptPath], {
          input,
          timeout: 180000,
          maxBuffer: 5 * 1024 * 1024
        });
        const result = JSON.parse(output.toString());
        if (result.success) {
          const idx = allChapters.findIndex((c: any) => c.id === chapter.id);
          if (idx !== -1) {
            allChapters[idx].audio_path = result.audio_path;
            allChapters[idx].audio_status = 'ready';
            allChapters[idx].duration_seconds = result.duration_seconds;
          }
          results.push({ id: chapter.id, title: chapter.title, status: 'generated', size: result.file_size });
        } else {
          results.push({ id: chapter.id, title: chapter.title, status: 'failed', error: result.error });
        }
      } catch (err) {
        results.push({ id: chapter.id, title: chapter.title, status: 'error', error: String(err) });
      }
    }

    writeChapters(allChapters);

    const generated = results.filter(r => r.status === 'generated').length;
    const cached = results.filter(r => r.status === 'cached').length;
    const failed = results.filter(r => ['failed', 'error'].includes(r.status)).length;

    return NextResponse.json({ success: true, total: docChapters.length, generated, cached, failed, results });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[TTS BULK ERROR] ${errorMsg}`);
    return NextResponse.json({ success: false, error: 'Bulk TTS failed', details: errorMsg }, { status: 500 });
  }
}
