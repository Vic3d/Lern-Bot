import { NextResponse } from 'next/server';

// Auf Vercel gibt es kein persistentes Filesystem.
// Dokumente werden client-seitig in localStorage gespeichert.
// Diese Route ist ein Stub — der echte State liegt im Browser.
export async function GET() {
  return NextResponse.json({
    documents: [],
    clientStorage: true,
    message: 'Documents are stored client-side in localStorage'
  });
}
