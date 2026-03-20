import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'all_chapters.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([], { status: 200 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error loading chapters:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
