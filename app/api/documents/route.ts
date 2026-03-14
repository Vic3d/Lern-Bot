import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const isVercel = process.env.VERCEL === '1';
    const baseDir = isVercel ? '/tmp' : process.cwd();
    const dbPath = path.join(baseDir, 'data', 'documents.json');
    
    let documents = [];
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      documents = JSON.parse(data);
    }

    return NextResponse.json({ documents, debug: { isVercel, dbPath } });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
