'use client';

import Link from 'next/link';

interface Document {
  id: string;
  filename: string;
  chapters_count: number;
  progress: number;
  last_accessed: string;
}

interface DocumentListProps {
  documents: Document[];
}

export default function DocumentList({ documents }: DocumentListProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '24px'
    }}>
      {documents.map((doc) => (
        <Link key={doc.id} href={`/reader/${doc.id}`} style={{ textDecoration: 'none' }}>
          <div
            style={{
              background: 'var(--white)',
              border: `1px solid var(--border)`,
              borderRadius: '12px',
              padding: '24px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(27, 58, 140, 0.12)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--navy)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            {/* Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              background: 'var(--off-white)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px'
            }}>
              📖
            </div>

            {/* Title */}
            <h3 style={{
              marginBottom: '8px',
              color: 'var(--text)',
              fontSize: '16px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {doc.filename}
            </h3>

            {/* Meta */}
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {doc.chapters_count} Kapitel
            </p>

            {/* Progress */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                <span>Fortschritt</span>
                <span>{Math.round(doc.progress * 100)}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--border)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    height: '100%',
                    background: 'var(--navy)',
                    width: `${doc.progress * 100}%`,
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
            </div>

            {/* Button */}
            <button
              style={{
                width: '100%',
                background: 'var(--navy)',
                color: 'var(--white)',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#122870';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--navy)';
              }}
            >
              Öffnen →
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
