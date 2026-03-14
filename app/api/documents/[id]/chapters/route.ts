import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isVercel = process.env.VERCEL === '1';
    const baseDir = isVercel ? '/tmp' : process.cwd();
    const chaptersFile = path.join(baseDir, 'data', 'chapters.json');
    
    let chapters = [];
    if (fs.existsSync(chaptersFile)) {
      const allChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
      chapters = allChapters.filter((ch: any) => ch.document_id === params.id);
    }

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch chapters',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
