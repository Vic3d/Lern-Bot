/**
 * Storage helper — lokaler Dev vs. Vercel
 *
 * Lokal:    liest/schreibt aus process.cwd()/data/
 * Vercel:   liest aus /tmp/data/, kopiert Seed aus public/seed/ beim ersten Zugriff
 *
 * Seed-Daten: public/seed/documents.json + chapters.json (committed im Repo)
 */
import fs from 'fs';
import path from 'path';

const IS_VERCEL = process.env.VERCEL === '1';

export function getDataDir(): string {
  return IS_VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data');
}

export function getUploadsDir(): string {
  return IS_VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
}

export function getAudioDir(): string {
  return IS_VERCEL ? '/tmp/audio' : path.join(process.cwd(), 'public', 'audio');
}

/**
 * Initialisiert Vercel-Temp-Verzeichnisse aus Seed-Daten (einmalig pro Container-Start)
 */
export function ensureDataDir(): void {
  const dataDir = getDataDir();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Seed-Daten einmalig in /tmp kopieren (nur auf Vercel + nur wenn noch nicht da)
  if (IS_VERCEL) {
    const seedDir = path.join(process.cwd(), 'public', 'seed');
    for (const file of ['documents.json', 'chapters.json']) {
      const target = path.join(dataDir, file);
      const seed = path.join(seedDir, file);
      if (!fs.existsSync(target) && fs.existsSync(seed)) {
        fs.copyFileSync(seed, target);
        console.log(`[STORAGE] Seed copied: ${file} → /tmp/data/`);
      }
    }
  }

  // Leere JSON-Dateien anlegen wenn nicht vorhanden
  for (const file of ['documents.json', 'chapters.json']) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
  }
}

export function readDocuments(): any[] {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(path.join(getDataDir(), 'documents.json'), 'utf-8'));
  } catch {
    return [];
  }
}

export function writeDocuments(docs: any[]): void {
  ensureDataDir();
  fs.writeFileSync(path.join(getDataDir(), 'documents.json'), JSON.stringify(docs, null, 2));
}

export function readChapters(): any[] {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(path.join(getDataDir(), 'chapters.json'), 'utf-8'));
  } catch {
    return [];
  }
}

export function writeChapters(chapters: any[]): void {
  ensureDataDir();
  fs.writeFileSync(path.join(getDataDir(), 'chapters.json'), JSON.stringify(chapters, null, 2));
}

export function isVercel(): boolean {
  return IS_VERCEL;
}
