// LEARN-FEATURES: Freitext-Antwort Bewertung via Claude
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250514';

export interface EvaluationResult {
  score: number;      // 0–100
  feedback: string;
  correct: boolean;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'no_api_key', message: 'Claude API Key in .env.local eintragen für KI-Features' },
      { status: 503 }
    );
  }

  let body: { question?: string; model_answer?: string; user_answer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { question, model_answer, user_answer } = body;
  if (!question || !model_answer || !user_answer) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Bewerte diese Antwort auf die Frage.
Sei ermutigend aber ehrlich. Wenn falsch, erkläre kurz warum.
Sprache: Deutsch.

Frage: ${question}
Musterlösung: ${model_answer}
Schülerantwort: ${user_answer}

Antworte NUR mit validem JSON ohne Markdown-Backticks:
{ "score": 0-100, "feedback": "...", "correct": true/false }`;

  const tryRequest = async (): Promise<EvaluationResult> => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned) as EvaluationResult;
  };

  try {
    const result = await tryRequest();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 429) {
      return NextResponse.json({ error: 'rate_limit', message: 'Bitte warte einen Moment...' }, { status: 429 });
    }
    try {
      const result = await tryRequest();
      return NextResponse.json(result);
    } catch (err2: unknown) {
      const e2 = err2 as { message?: string };
      return NextResponse.json({ error: 'api_error', message: e2?.message || 'Unbekannter Fehler' }, { status: 500 });
    }
  }
}
