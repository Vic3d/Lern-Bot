// LEARN-FEATURES: Quiz-Generierung via Claude
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250514';

export interface QuizQuestion {
  type: 'mc' | 'free';
  question: string;
  // MC only
  options?: string[];
  correct?: number;
  // Free only
  model_answer?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

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
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Du bist ein Prüfer für dieses Lernkapitel. Erstelle 5 Fragen:
- 3 Multiple Choice (je 4 Optionen, markiere die richtige mit *)
- 2 Freitext-Fragen (Antwort in 1-2 Sätzen)

Schwierigkeit: Verständnis-Level (nicht nur Auswendiglernen).
Beziehe dich auf konkrete Inhalte aus dem Kapitel.
Sprache: Deutsch.

Kapitel: "${chapter_title}"

Text:
${chapter_text.slice(0, 8000)}

Antworte NUR mit validem JSON ohne Markdown-Backticks:
{
  "questions": [
    { "type": "mc", "question": "...", "options": ["A", "B", "C", "D"], "correct": 0 },
    { "type": "free", "question": "...", "model_answer": "..." }
  ]
}

Die richtige Antwort bei MC: "correct" ist der Index (0-3) der richtigen Option.`;

  const tryRequest = async (): Promise<QuizData> => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned) as QuizData;
  };

  try {
    const quiz = await tryRequest();
    return NextResponse.json({ ...quiz, chapterId: params.id });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 429) {
      return NextResponse.json({ error: 'rate_limit', message: 'Bitte warte einen Moment...' }, { status: 429 });
    }
    try {
      const quiz = await tryRequest();
      return NextResponse.json({ ...quiz, chapterId: params.id });
    } catch (err2: unknown) {
      const e2 = err2 as { message?: string };
      return NextResponse.json({ error: 'api_error', message: e2?.message || 'Unbekannter Fehler' }, { status: 500 });
    }
  }
}
