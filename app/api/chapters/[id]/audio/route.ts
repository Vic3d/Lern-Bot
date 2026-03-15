import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const baseDir = process.cwd();
    const chaptersFile = path.join(baseDir, 'data', 'chapters.json');

    if (!fs.existsSync(chaptersFile)) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
    const chapter = chapters.find((ch: any) => ch.id === params.id);

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    if (!chapter.audio_path) {
      return NextResponse.json(
        { error: 'Audio not yet generated', status: chapter.audio_status },
        { status: 202 }  // 202 Accepted = noch ausstehend
      );
    }

    const audioPath = path.join(baseDir, 'public', chapter.audio_path.replace(/^\//, ''));

    if (!fs.existsSync(audioPath)) {
      return NextResponse.json(
        { error: 'Audio file missing', audio_path: chapter.audio_path },
        { status: 404 }
      );
    }

    const audioBuffer = fs.readFileSync(audioPath);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error('Error serving audio:', error);
    return NextResponse.json(
      { error: 'Failed to serve audio' },
      { status: 500 }
    );
  }
}
