import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const documents = [
      {
        id: '1',
        filename: 'TME102_Statik.pdf',
        chapters_count: 8,
        progress: 0.45,
        last_accessed: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
