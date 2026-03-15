import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { isVercel, getAudioDir, readChapters, writeChapters } from '@/lib/storage';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auf Vercel: Browser-TTS verwenden (kein Server-TTS möglich)
  if (isVercel()) {
    return NextResponse.json({
      success: false,
      vercel: true,
      error: 'Server-TTS ist auf Vercel nicht verfügbar.',
      hint: 'Nutze die Browser-Sprachausgabe (Web Speech API) im Player.'
    }, { status: 503 });
  }

  try {
    const allChapters = readChapters();
    const chapterIdx = allChapters.findIndex((ch: any) => ch.id === params.id);

    if (chapterIdx === -1) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapter = allChapters[chapterIdx];

    // Schon vorhanden?
    if (chapter.audio_path) {
      const audioFile = path.join(process.cwd(), 'public', chapter.audio_path.replace(/^\//, ''));
      if (fs.existsSync(audioFile)) {
        return NextResponse.json({
          success: true,
          audio_path: chapter.audio_path,
          duration_seconds: chapter.duration_seconds,
          cached: true
        });
      }
    }

    const audioDir = getAudioDir();
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_tts.py');
    const chapterId = `chapter-${chapter.id}`;

    console.log(`[TTS] "${chapter.title}" (${chapter.word_count} words)`);

    const input = JSON.stringify({
      chapter_id: chapterId,
      text: chapter.cleaned_text,
      output_dir: audioDir
    });

    const output = execFileSync('python3', [scriptPath], {
      input,
      timeout: 180000,
      maxBuffer: 5 * 1024 * 1024
    });

    const result = JSON.parse(output.toString());
    if (!result.success) throw new Error(result.error || 'TTS failed');

    allChapters[chapterIdx].audio_path = result.audio_path;
    allChapters[chapterIdx].audio_status = 'ready';
    allChapters[chapterIdx].duration_seconds = result.duration_seconds;
    writeChapters(allChapters);

    console.log(`[TTS] Done — ${result.file_size} bytes → ${result.audio_path}`);

    return NextResponse.json({
      success: true,
      audio_path: result.audio_path,
      duration_seconds: result.duration_seconds,
      size: result.file_size,
      message: `Audio für "${chapter.title}" generiert`
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[TTS ERROR] ${errorMsg}`);
    return NextResponse.json({ success: false, error: 'TTS failed', details: errorMsg }, { status: 500 });
  }
}
