import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chaptersFile = path.join(process.cwd(), 'data', 'chapters.json');
    
    let chapters = [];
    if (fs.existsSync(chaptersFile)) {
      const allChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
      chapters = allChapters.filter((ch: any) => ch.document_id === params.id);
    }

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}
