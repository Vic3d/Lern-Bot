'use client';

import { useRef, useEffect, useMemo } from 'react';

interface TranscriptProps {
  text: string;
  highlightCharIndex: number;
  bionicReading: boolean;
}

interface Sentence {
  text: string;
  start: number;
}

function parseSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  const regex = /[^.!?\n]*[.!?\n]+\s*/g;
  let match;
  let lastEnd = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].trim()) sentences.push({ text: match[0], start: match.index });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < text.length && text.substring(lastEnd).trim()) {
    sentences.push({ text: text.substring(lastEnd), start: lastEnd });
  }
  return sentences;
}

function BionicWord({ word }: { word: string }) {
  if (word.length <= 2) return <><strong>{word}</strong></>;
  const boldLen = Math.ceil(word.length * 0.45);
  return <><strong>{word.slice(0, boldLen)}</strong>{word.slice(boldLen)}</>;
}

export default function Transcript({ text, highlightCharIndex, bionicReading }: TranscriptProps) {
  const sentences = useMemo(() => parseSentences(text), [text]);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  const activeIdx = useMemo(() => {
    if (highlightCharIndex < 0) return -1;
    let idx = 0;
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (sentences[i].start <= highlightCharIndex) { idx = i; break; }
    }
    return idx;
  }, [highlightCharIndex, sentences]);

  useEffect(() => {
    if (activeIdx >= 0 && refs.current[activeIdx]) {
      refs.current[activeIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx]);

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text)' }}>
        📄 Transcript
      </h3>
      <p style={{ color: 'var(--text)', lineHeight: 1.9, fontSize: '16px', letterSpacing: '0.01em' }}>
        {sentences.map((sentence, i) => (
          <span
            key={i}
            ref={el => { refs.current[i] = el; }}
            style={{
              backgroundColor: i === activeIdx ? '#dbeafe' : 'transparent',
              borderRadius: i === activeIdx ? '3px' : '0',
              padding: i === activeIdx ? '1px 2px' : '0',
              transition: 'background-color 0.25s ease',
              display: 'inline',
            }}
          >
            {bionicReading
              ? sentence.text.split(/(\s+)/).map((part, j) =>
                  /^\s+$/.test(part) ? part : <span key={j}><BionicWord word={part} /></span>
                )
              : sentence.text
            }
          </span>
        ))}
      </p>
    </div>
  );
}
