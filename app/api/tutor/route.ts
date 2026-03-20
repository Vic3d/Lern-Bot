import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not set' },
      { status: 500 }
    );
  }

  let message = '';
  let kapitelText = '';

  try {
    const body = await req.json();
    message = body.message || '';
    kapitelText = body.kapitelText || '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!message.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // System prompt mit pädagogischem Kontext
  const systemPrompt = `Du bist Albert, ein persönlicher Tutor für Technische Mechanik. 
Dein Ziel: Victors Verständnis für TME (Technische Mechanik Einführung) aufbauen.

## Deine Regeln:
1. **Arbeited Examples**: Zeige komplette Lösungen Schritt für Schritt, dann reduziere deine Hilfe
2. **Visuell + Auditiv**: Erkläre mit Diagrammen (ASCII-Skizzen OK) UND gesprochener Erklärung
3. **Aktives Recall**: Stelle Fragen, statt nur zu erzählen
4. **Fehler als Chancen**: Wenn Victor was falsch macht → sokratische Methode (Fragen stellen)
5. **Formeln**: IMMER in $...$ LaTeX-Notation (z.B. $F = m \\cdot a$)

## Aktuelles Kapitel-Material:
${kapitelText ? `\`\`\`\n${kapitelText}\n\`\`\`` : '(Kein Kapitel geladen)'}

## Tone:
- Locker, freundlich, nicht belehrend
- Schaff Vertrauen — Victor soll gerne nachfragen
- Kurz halten, aber präzise

Antworte auf Deutsch. Nutze Markdown und LaTeX für Formeln.`;

  try {
    // Use standard fetch for streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return NextResponse.json(
        { error: 'Failed to get response from Claude' },
        { status: 500 }
      );
    }

    // Return the streaming response
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Tutor route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
