# Smart PDF Reader

Learn by listening. Upload PDFs and intelligently extract content for audio learning.

## Features

- 📁 Upload PDF documents
- 🎤 Smart text extraction (boilerplate removal)
- 🎵 Audio playback with speed controls
- 📖 Live transcript display
- ✅ Auto-save progress
- 📊 Track comprehension

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Storage:** Local filesystem (MVP) / PostgreSQL (production)
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

## Deployment to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Deploy:

```bash
vercel
```

## Architecture

```
/app
├── app/
│   ├── page.tsx           # Home (document library)
│   ├── reader/[id]/       # Reader page
│   ├── components/        # React components
│   │   ├── AudioPlayer
│   │   ├── Transcript
│   │   ├── DocumentList
│   │   └── DocumentUpload
│   └── api/               # API routes
│       ├── documents/     # Document management
│       └── chapters/      # Chapter + audio serving
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── vercel.json
```

## Next Steps

- [ ] Connect to database (PostgreSQL)
- [ ] Implement PDF extraction
- [ ] Generate audio with pyttsx3 backend
- [ ] Add comprehension questions
- [ ] Deploy to Vercel
- [ ] User testing with Victor

## Notes

MVP uses mock data. Replace API routes with real database queries once infrastructure is ready.
