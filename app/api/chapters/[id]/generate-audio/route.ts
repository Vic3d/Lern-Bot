import { NextRequest, NextResponse } from 'next/server';

// Auf Vercel: Python/gTTS nicht verfügbar.
// TTS läuft über Web Speech API im Browser (bereits in AudioPlayer implementiert).
// Diese Route ist ein Stub — gibt Infos zurück ohne serverseitige Verarbeitung.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const chapter = body.chapter;

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter data required' }, { status: 400 });
    }

    // Kein serverseitiges Audio — Web Speech API im Browser übernimmt
    return NextResponse.json({
      success: true,
      audio_path: null,
      useWebSpeech: true,
      duration_seconds: chapter.duration_seconds,
      message: 'Web Speech API wird verwendet (kein Server-Audio nötig)'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
