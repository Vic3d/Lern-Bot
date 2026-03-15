// LEARN-FEATURES: Erklär-Modus via Claude
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250514';

type ExplainStyle = 'simple' | 'analogy' | 'step_by_step' | 'example';

const STYLE_DESCRIPTIONS: Record<ExplainStyle, string> = {
  simple: 'In 2-3 Sätzen, als würdest du es einem Freund erklären',
  analogy: 'Mit einer Analogie aus dem Alltag',
  step_by_step: 'Schritt für Schritt durchgehen',
  example: 'Mit einem konkreten Beispiel',
};

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'no_api_key', message: 'Claude API Key in .env.local eintragen für KI-Features' },
      { status: 503 }
    );
  }

  let body: { text?: string; chapter_context?: string; style?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { text, chapter_context } = body;
  const style: ExplainStyle = (body.style as ExplainStyle) || 'simple';

  if (!text) {
    return NextResponse.json({ error: 'missing_fields', message: 'text ist erforderlich' }, { status: 400 });
  }

  const styleDescription = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.simple;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Erkläre diesen Abschnitt aus einem Lernkapitel.
Stil: ${style} — ${styleDescription}
Sprache: Deutsch.
${chapter_context ? `Kontext (Kapiteltitel): ${chapter_context}` : ''}

Abschnitt:
${text.slice(0, 3000)}

Gib nur die Erklärung zurück, kein Präambel wie "Hier ist die Erklärung:".`;

  const tryRequest = async (): Promise<string> => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 768,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim();
  };

  try {
    const explanation = await tryRequest();
    return NextResponse.json({ explanation, style });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 429) {
      return NextResponse.json({ error: 'rate_limit', message: 'Bitte warte einen Moment...' }, { status: 429 });
    }
    try {
      const explanation = await tryRequest();
      return NextResponse.json({ explanation, style });
    } catch (err2: unknown) {
      const e2 = err2 as { message?: string };
      return NextResponse.json({ error: 'api_error', message: e2?.message || 'Unbekannter Fehler' }, { status: 500 });
    }
  }
}
