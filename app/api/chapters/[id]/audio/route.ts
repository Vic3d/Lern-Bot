import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chaptersFile = path.join(process.cwd(), 'data', 'chapters.json');
    
    if (!fs.existsSync(chaptersFile)) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
    const chapter = chapters.find((ch: any) => ch.id === params.id);

    if (!chapter || !chapter.audio_path) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    const audioPath = path.join(process.cwd(), 'public', chapter.audio_path.replace(/^\//, ''));

    if (!fs.existsSync(audioPath)) {
      // Return 404 but don't error - audio might still be generating
      return NextResponse.json({ error: 'Audio file not ready' }, { status: 404 });
    }

    const audioBuffer = fs.readFileSync(audioPath);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000'
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
