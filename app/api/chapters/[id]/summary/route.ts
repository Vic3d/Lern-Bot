// LEARN-FEATURES: Kapitel-Zusammenfassungen via Claude
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250514';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'no_api_key', message: 'Claude API Key in .env.local eintragen für KI-Features' },
      { status: 503 }
    );
  }

  let body: { chapter_text?: string; chapter_title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { chapter_text, chapter_title } = body;
  if (!chapter_text || !chapter_title) {
    return NextResponse.json({ error: 'missing_fields', message: 'chapter_text und chapter_title sind erforderlich' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Du bist ein Lern-Tutor. Fasse dieses Kapitel in 3-5 Bullet Points zusammen.
Jeder Punkt: 1 Satz, einfache Sprache, das Wichtigste.
Wenn es Formeln gibt: erkläre was sie bedeuten, nicht nur die Formel.
Sprache: Deutsch.

Kapitel: "${chapter_title}"

Text:
${chapter_text.slice(0, 8000)}

Gib NUR die Bullet Points zurück, einen pro Zeile, ohne Nummerierung oder Sonderzeichen am Anfang.`;

  const tryRequest = async (): Promise<string[]> => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const lines = text
      .split('\n')
      .map(l => l.replace(/^[-•*·]\s*/, '').trim())
      .filter(l => l.length > 0);

    return lines;
  };

  try {
    const summary = await tryRequest();
    return NextResponse.json({ summary, chapterId: params.id });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 429) {
      return NextResponse.json({ error: 'rate_limit', message: 'Bitte warte einen Moment...' }, { status: 429 });
    }
    // Retry once
    try {
      const summary = await tryRequest();
      return NextResponse.json({ summary, chapterId: params.id });
    } catch (err2: unknown) {
      const e2 = err2 as { message?: string };
      return NextResponse.json({ error: 'api_error', message: e2?.message || 'Unbekannter Fehler' }, { status: 500 });
    }
  }
}
