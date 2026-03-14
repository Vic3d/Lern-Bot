import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DOCS_FILE = path.join(DB_DIR, 'documents.json');
const CHAPTERS_FILE = path.join(DB_DIR, 'chapters.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize files
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
