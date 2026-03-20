import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, context } = await req.json();

    if (!imageBase64) {
      return Response.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Das ist eine Zeichnung aus einer Mechanik-Vorlesung (${context || 'Technische Mechanik'}). Erkläre was auf der Zeichnung zu sehen ist und ob es korrekt dargestellt ist. Antworte auf Deutsch, kurz und präzise (max. 3 Sätze).`,
          },
        ],
      }],
    });

    return Response.json({ explanation: (response.content[0] as { type: string; text: string }).text });
  } catch (error) {
    console.error('Vision API error:', error);
    return Response.json({ error: 'Fehler bei der Bildanalyse' }, { status: 500 });
  }
}
