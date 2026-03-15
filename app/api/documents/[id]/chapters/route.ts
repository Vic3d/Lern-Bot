import { NextRequest, NextResponse } from 'next/server';
import { readChapters } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const allChapters = readChapters();
    const chapters = allChapters.filter((ch: any) => ch.document_id === params.id);
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters', details: String(error) },
      { status: 500 }
    );
  }
}
