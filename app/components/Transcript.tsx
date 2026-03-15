'use client';

import { useRef, useEffect, useMemo, useState } from 'react';

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

function renderBionicWord(word: string, key: number): React.ReactNode {
  if (!word.trim()) return <span key={key}>{word}</span>;
  const boldLen = Math.ceil(word.length * 0.4);
  return (
    <span key={key}>
      <strong>{word.slice(0, boldLen)}</strong>{word.slice(boldLen)}
    </span>
  );
}

function renderSentenceContent(sentence: string, bionic: boolean): React.ReactNode {
  if (!bionic) return sentence;
  const tokens = sentence.split(/(\s+)/);
  return tokens.map((token, i) =>
    /^\s+$/.test(token) ? token : renderBionicWord(token, i)
  );
}

export default function Transcript({ text, highlightCharIndex, bionicReading }: TranscriptProps) {
  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);



  const toggleBionic = () => {
    const next = !bionicReading;
    localStorage.setItem('lernbot_bionic', String(next));
  };

  const sentences = useMemo(() => parseSentences(text || ''), [text]);

  const activeSentenceIdx = useMemo(() => {
    if (highlightCharIndex < 0 || sentences.length === 0) return -1;
    let found = 0;
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (highlightCharIndex >= sentences[i].start) {
        found = i;
        break;
      }
    }
    return found;
  }, [highlightCharIndex, sentences]);

  useEffect(() => {
    if (activeSentenceIdx >= 0 && sentenceRefs.current[activeSentenceIdx]) {
      sentenceRefs.current[activeSentenceIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSentenceIdx]);

  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
          Transcript
        </h3>
        <button
          onClick={toggleBionic}
          title={bionicReading ? 'Bionic Reading deaktivieren' : 'Bionic Reading aktivieren'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '2px solid ' + (bionicReading ? 'var(--navy)' : 'var(--border)'),
            background: bionicReading ? 'var(--navy)' : 'var(--white)',
            color: bionicReading ? 'var(--white)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          Bionic
          <span style={{
            width: '28px', height: '16px',
            background: bionicReading ? 'var(--gold)' : 'var(--border)',
            borderRadius: '8px', position: 'relative', display: 'inline-block',
            transition: 'background 0.2s', flexShrink: 0,
          }}>
            <span style={{
              position: 'absolute', top: '2px',
              left: bionicReading ? '14px' : '2px',
              width: '12px', height: '12px',
              background: 'var(--white)', borderRadius: '50%',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </span>
        </button>
      </div>

      <div style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: '16px' }}>
        {sentences.map((sentence, i) => (
          <span
            key={i}
            ref={(el) => { sentenceRefs.current[i] = el; }}
            style={{
              display: 'inline',
              backgroundColor: i === activeSentenceIdx ? 'rgba(232,184,0,0.25)' : 'transparent',
              borderRadius: i === activeSentenceIdx ? '3px' : '0',
              outline: i === activeSentenceIdx ? '2px solid rgba(232,184,0,0.6)' : 'none',
              transition: 'background-color 0.25s ease, outline 0.25s ease',
              padding: i === activeSentenceIdx ? '1px 0' : '0',
            }}
          >
            {renderSentenceContent(sentence.text, bionicReading)}
          </span>
        ))}
      </div>
    </div>
  );
}
