import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const document = {
      id: Date.now().toString(),
      filename: file.name,
      chapters_count: 0,
      progress: 0,
      last_accessed: new Date().toISOString(),
    };

    return NextResponse.json({ document, status: 'processing' });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
