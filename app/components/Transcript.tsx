'use client';

interface TranscriptProps {
  text: string;
}

export default function Transcript({ text }: TranscriptProps) {
  return (
    <div style={{
      background: 'var(--white)',
      border: `1px solid var(--border)`,
      borderRadius: '12px',
      padding: '32px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '24px',
        color: 'var(--text)'
      }}>
        📄 Transcript
      </h3>
      <p style={{
        color: 'var(--text)',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        fontSize: '16px'
      }}>
        {text}
      </p>
    </div>
  );
}
