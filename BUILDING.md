# Building Smart PDF Reader

## Status: MVP Frontend Ready ✅

The Next.js app structure is complete and ready to build!

## What's Done

```
✅ Next.js 14 app scaffolding
✅ UI Components (AudioPlayer, Transcript, DocumentList, DocumentUpload)
✅ API routes (stubbed, ready for implementation)
✅ Tailwind CSS styling
✅ Mock data for testing
✅ Vercel-ready configuration
```

## Next Steps (In Order)

### Step 1: Install & Run Locally (Today)
```bash
cd /data/.openclaw/workspace/lernbot/app

npm install
npm run dev
```

Open http://localhost:3000 → You should see the home page with document upload.

### Step 2: Connect to Database (Day 2)
- Set up PostgreSQL (local or Vercel Postgres)
- Create tables (documents, chapters, sessions)
- Replace mock data in API routes with real queries

### Step 3: Implement PDF Processing (Day 3-4)
- Hook up PDF extraction (`generate_audio.py` from parent dir)
- Implement `/api/documents/upload` route
- Queue background jobs for audio generation

### Step 4: Test & Polish (Day 4-5)
- Full end-to-end: Upload → Extract → Generate → Play
- Add error handling
- Mobile responsive fixes

### Step 5: Deploy to Vercel (Day 6)
```bash
vercel
```

## File Structure

```
lernbot/
├── app/                      ← NEW Next.js app (THIS FOLDER)
│   ├── app/
│   │   ├── page.tsx          # Home page
│   │   ├── reader/[id]/page.tsx
│   │   ├── components/       # Reusable React components
│   │   ├── api/              # API routes
│   │   └── globals.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── vercel.json
│   └── README.md
│
├── output/                   # Extracted text + generated audio
├── scripts/
│   ├── generate_audio.py     # TTS engine (pyttsx3)
│   └── smart_pdf_extractor.py
└── [old files...]
```

## Database Schema (Ready to Implement)

```sql
-- Documents (uploaded PDFs)
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chapters (extracted from PDFs)
CREATE TABLE chapters (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  chapter_num INTEGER,
  title VARCHAR(255),
  cleaned_text TEXT,
  audio_path VARCHAR(512),
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (user progress tracking)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  chapter_id UUID REFERENCES chapters(id),
  last_position_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  playback_speed FLOAT DEFAULT 1.0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints (To Implement)

```
POST   /api/documents/upload         → Upload PDF
GET    /api/documents                → List documents
GET    /api/documents/:id/chapters   → Get chapters
GET    /api/chapters/:id/audio       → Stream audio
PUT    /api/sessions/:id             → Save progress
```

## Environment Variables

```
DATABASE_URL=postgresql://...
AUDIO_STORAGE_PATH=/data/.openclaw/workspace/lernbot/output
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Deployment Checklist

- [ ] Database set up (PostgreSQL or Vercel Postgres)
- [ ] Environment variables configured
- [ ] PDF extraction integrated
- [ ] Audio generation working
- [ ] All API routes implemented
- [ ] Mobile tested
- [ ] Vercel project created
- [ ] Domain configured (optional)

## Help / Questions

See `/app/README.md` for architecture details.
