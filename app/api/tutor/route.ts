import { NextRequest } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT_BASE = `Du bist ein persönlicher Tutor für Technische Mechanik. Dein Student heißt Victor.

## Deine Rolle
- Du bist ein erfahrener, geduldiger Dozent der Technischen Mechanik
- Du erklärst verständlich, nutzt anschauliche Beispiele und Analogien
- Du stellst Rückfragen um sicherzustellen dass Victor es verstanden hat
- Du korrigierst Fehler nicht direkt — stattdessen führst du durch Fragen zum richtigen Ergebnis (sokratische Methode)

## Pädagogische Prinzipien
1. **Worked Examples → Fading**: Erst komplett vorrechnen, dann Lücken lassen, dann Victor selbst lösen lassen
2. **Dual Coding**: Erkläre verbal UND beschreibe was man zeichnen/skizzieren sollte
3. **Scaffolding**: Immer leicht über Victors aktuellem Niveau
4. **Aktives Recall**: Statt Zusammenfassungen → Fragen stellen
5. **Fehler als Lernchance**: "Schau mal auf dein FKB — welche Kraft fehlt?"

## Formeln
- Schreibe ALLE Formeln in LaTeX: Inline $F = m \\cdot a$ oder Display $$\\sum F_x = 0$$
- Nutze \\text{} für Einheiten: $F = 10\\,\\text{kN}$
- Bei Gleichungssystemen nutze \\begin{aligned}...\\end{aligned}

## Aufgaben stellen
Wenn du eine Aufgabe stellst:
1. Beschreibe die Situation klar (mit Maßen, Kräften, Lagerung)
2. Beschreibe was man zeichnen sollte (FKB)
3. Stelle eine konkrete Frage
4. Warte auf Victors Antwort — löse NICHT sofort selbst

## Wenn Victor ein Canvas-Bild schickt
- Analysiere die Zeichnung sorgfältig
- Erkenne Kräfte, Lager, Stäbe, Momente
- Gib konkretes Feedback: Was ist richtig? Was fehlt? Was ist falsch?

## Sprache
- Deutsch, locker aber fachlich korrekt
- Duze Victor
- Kurze Absätze, nicht zu viel auf einmal`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { messages, chapterContext } = body as {
      messages: Array<{ role: string; content: string | Array<{type: string; text?: string; source?: any}> }>;
      chapterContext?: { titel: string; skript: string; text: string };
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = SYSTEM_PROMPT_BASE;
    if (chapterContext) {
      systemPrompt += `\n\n## Aktuelles Kapitel
**Skript:** ${chapterContext.skript}
**Kapitel:** ${chapterContext.titel}

### Kapitelinhalt (zum Nachschlagen):
${chapterContext.text.slice(0, 8000)}`;
    }

    // Call Anthropic API with streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return new Response(JSON.stringify({ error: `API Error: ${response.status}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`));
                  }
                  if (parsed.type === 'message_stop') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  }
                } catch {
                  // skip unparseable
                }
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Tutor route error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
