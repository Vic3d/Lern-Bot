import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'documents.json');
    
    let documents = [];
    if (fs.existsSync(dbPath)) {
      documents = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
