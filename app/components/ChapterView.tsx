'use client';

import ReactMarkdown from 'react-markdown';
import RemarkMath from 'remark-math';
import RehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Chapter {
  id: string;
  skript: string;
  kapitel_nr: string;
  titel: string;
  text: string;
  seite_von: number;
  seite_bis: number;
}

interface ChapterViewProps {
  chapter: Chapter | null;
  onLearnClick: () => void;
}

// Extract first paragraph as summary
function extractSummary(text: string, maxLength: number = 300): string {
  const firstParagraph = text.split('\n\n')[0];
  if (firstParagraph.length > maxLength) {
    return firstParagraph.substring(0, maxLength) + '...';
  }
  return firstParagraph;
}

export function ChapterView({ chapter, onLearnClick }: ChapterViewProps) {
  if (!chapter) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
        }}
      >
        <p>← Wähle ein Kapitel aus</p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                background: 'var(--accent)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {chapter.skript}
            </span>
          </div>
          <h1
            style={{
              margin: '0.5rem 0 0 0',
              fontSize: '2rem',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {chapter.kapitel_nr} {chapter.titel}
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Seite {chapter.seite_von}–{chapter.seite_bis}
          </p>
        </div>

        {/* Summary */}
        <div
          style={{
            background: 'var(--accent-light)',
            border: `1px solid var(--accent)`,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
          }}
        >
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {extractSummary(chapter.text)}
          </p>
        </div>

        {/* Learn Button */}
        <button
          onClick={onLearnClick}
          style={{
            background: 'var(--accent)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontWeight: 600,
            marginBottom: '2rem',
            cursor: 'pointer',
            border: 'none',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          📖 Dieses Kapitel mit KI-Tutor erkunden
        </button>

        {/* Full Text with Markdown */}
        <div
          className="chat-markdown"
          style={{
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}
        >
          <ReactMarkdown
            remarkPlugins={[RemarkMath]}
            rehypePlugins={[RehypeKatex]}
            components={{
              h1: ({ children }) => (
                <h1 style={{ color: 'var(--text-primary)', marginTop: '1.5em' }}>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ color: 'var(--text-primary)', marginTop: '1.3em' }}>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ color: 'var(--text-primary)', marginTop: '1.1em' }}>{children}</h3>
              ),
              p: ({ children }) => <p style={{ marginBottom: '0.8em' }}>{children}</p>,
              ul: ({ children }) => (
                <ul style={{ marginBottom: '0.8em', marginLeft: '1.5em' }}>{children}</ul>
              ),
              li: ({ children }) => <li style={{ marginBottom: '0.3em' }}>{children}</li>,
            }}
          >
            {chapter.text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
