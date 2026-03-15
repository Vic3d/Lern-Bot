import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // No API key → tell client to use Web Speech API
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ useWebSpeech: true }, { status: 200 });
  }

  let text: string;
  let voice: string = 'nova';

  try {
    const body = await req.json();
    text = body.text || '';
    if (body.voice) voice = body.voice;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  // Truncate to OpenAI's limit (4096 chars for tts-1)
  const truncated = text.slice(0, 4096);

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncated,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      console.error('OpenAI TTS error:', openAiResponse.status, errText);
      // Graceful fallback: tell client to use Web Speech
      return NextResponse.json({ useWebSpeech: true }, { status: 200 });
    }

    // Stream audio back to client
    const audioBuffer = await openAiResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('TTS route error:', err);
    // Fallback to web speech on any error
    return NextResponse.json({ useWebSpeech: true }, { status: 200 });
  }
}
