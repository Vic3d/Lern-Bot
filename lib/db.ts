import fs from 'fs';
import path from 'path';

// Vercel: writable dir is /tmp. Locally: project root.
const isVercel = process.env.VERCEL === '1';
const BASE_DIR = isVercel ? '/tmp' : process.cwd();

const DB_DIR = path.join(BASE_DIR, 'data');
const DOCS_FILE = path.join(DB_DIR, 'documents.json');
const CHAPTERS_FILE = path.join(DB_DIR, 'chapters.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Seed from project-root data/ if running on Vercel and /tmp/data is empty
function seedIfNeeded() {
  if (!isVercel) return;
  const srcDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DOCS_FILE) && fs.existsSync(path.join(srcDir, 'documents.json'))) {
    try {
      fs.copyFileSync(path.join(srcDir, 'documents.json'), DOCS_FILE);
    } catch {}
  }
  if (!fs.existsSync(CHAPTERS_FILE) && fs.existsSync(path.join(srcDir, 'chapters.json'))) {
    try {
      fs.copyFileSync(path.join(srcDir, 'chapters.json'), CHAPTERS_FILE);
    } catch {}
  }
}

seedIfNeeded();

// Initialize files if still missing
if (!fs.existsSync(DOCS_FILE)) {
  fs.writeFileSync(DOCS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(CHAPTERS_FILE)) {
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify([], null, 2));
}

export function getDocuments() {
  const data = fs.readFileSync(DOCS_FILE, 'utf-8');
  return JSON.parse(data);
}

export function addDocument(doc: any) {
  const docs = getDocuments();
  docs.push(doc);
  fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2));
  return doc;
}

export function getChapters(documentId: string) {
  const data = fs.readFileSync(CHAPTERS_FILE, 'utf-8');
  const allChapters = JSON.parse(data);
  return allChapters.filter((ch: any) => ch.document_id === documentId);
}

export function addChapter(chapter: any) {
  const chapters = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));
  chapters.push(chapter);
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify(chapters, null, 2));
  return chapter;
}

export function getChapter(chapterId: string) {
  const data = fs.readFileSync(CHAPTERS_FILE, 'utf-8');
  const chapters = JSON.parse(data);
  return chapters.find((ch: any) => ch.id === chapterId);
}

export function updateChapter(chapterId: string, updates: Partial<any>) {
  const chapters = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));
  const updated = chapters.map((ch: any) => (ch.id === chapterId ? { ...ch, ...updates } : ch));
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify(updated, null, 2));
  return updated.find((ch: any) => ch.id === chapterId);
}
