import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const baseDir = process.cwd();
    const chaptersFile = path.join(baseDir, 'data', 'chapters.json');

    if (!fs.existsSync(chaptersFile)) {
      return NextResponse.json({ error: 'No chapters found' }, { status: 404 });
    }

    const allChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
    const chapterIdx = allChapters.findIndex((ch: any) => ch.id === params.id);

    if (chapterIdx === -1) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapter = allChapters[chapterIdx];

    // Audio schon vorhanden?
    if (chapter.audio_path) {
      const audioFile = path.join(baseDir, 'public', chapter.audio_path.replace(/^\//, ''));
      if (fs.existsSync(audioFile)) {
        return NextResponse.json({
          success: true,
          audio_path: chapter.audio_path,
          duration_seconds: chapter.duration_seconds,
          cached: true
        });
      }
    }

    const audioDir = path.join(baseDir, 'public', 'audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const scriptPath = path.join(baseDir, 'scripts', 'generate_tts.py');
    const chapterId = `chapter-${chapter.id}`;

    console.log(`[TTS] Generating: "${chapter.title}" (${chapter.word_count} words)`);

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

    if (!result.success) {
      throw new Error(result.error || 'TTS generation failed');
    }

    // chapters.json updaten
    allChapters[chapterIdx].audio_path = result.audio_path;
    allChapters[chapterIdx].audio_status = 'ready';
    allChapters[chapterIdx].duration_seconds = result.duration_seconds;
    fs.writeFileSync(chaptersFile, JSON.stringify(allChapters, null, 2));

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
    return NextResponse.json(
      { success: false, error: 'TTS generation failed', details: errorMsg },
      { status: 500 }
    );
  }
}
