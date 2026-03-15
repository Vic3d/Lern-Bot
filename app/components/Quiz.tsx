'use client';
// LEARN-FEATURES: Quiz Komponente

import { useState, useEffect, useCallback } from 'react';

interface MCQuestion {
  type: 'mc';
  question: string;
  options: string[];
  correct: number;
}

interface FreeQuestion {
  type: 'free';
  question: string;
  model_answer: string;
}

type Question = MCQuestion | FreeQuestion;

interface QuizData {
  questions: Question[];
}

interface QuizResult {
  questionIndex: number;
  correct: boolean;
  score?: number;
  feedback?: string;
  userAnswer: string;
}

interface QuizProps {
  chapterId: string;
  chapterText: string;
  chapterTitle: string;
}

const QUIZ_CACHE_KEY = (id: string) => `lernflow_quiz_${id}`;
const RESULTS_KEY = (id: string) => `lernflow_quiz_results_${id}`;

export default function Quiz({ chapterId, chapterText, chapterTitle }: QuizProps) {
  const [open, setOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [mcSelected, setMcSelected] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null);
  const [showingSummary, setShowingSummary] = useState(false);

  // Load cached quiz
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = localStorage.getItem(QUIZ_CACHE_KEY(chapterId));
    if (cached) {
      try { setQuiz(JSON.parse(cached)); } catch { /* ignore */ }
    }
  }, [chapterId]);

  const loadQuiz = useCallback(async (invalidate = false) => {
    if (invalidate && typeof window !== 'undefined') {
      localStorage.removeItem(QUIZ_CACHE_KEY(chapterId));
      setQuiz(null);
    }
    setLoading(true);
    setError(null);
    setCurrentQ(0);
    setResults([]);
    setCurrentResult(null);
    setShowingSummary(false);

    try {
      const res = await fetch(`/api/chapters/${chapterId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_text: chapterText, chapter_title: chapterTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'no_api_key' ? 'api_key' : data.error === 'rate_limit' ? 'rate_limit' : 'generic');
        return;
      }
      const quizData: QuizData = { questions: data.questions || [] };
      setQuiz(quizData);
      if (typeof window !== 'undefined') {
        localStorage.setItem(QUIZ_CACHE_KEY(chapterId), JSON.stringify(quizData));
      }
    } catch {
      setError('generic');
    } finally {
      setLoading(false);
    }
  }, [chapterId, chapterText, chapterTitle]);

  const handleOpen = () => {
    setOpen(true);
    if (!quiz) loadQuiz();
    else {
      setCurrentQ(0);
      setResults([]);
      setCurrentResult(null);
      setShowingSummary(false);
    }
  };

  const handleClose = () => setOpen(false);

  const handleMCSelect = useCallback((optionIndex: number) => {
    if (mcSelected !== null) return; // Already answered
    const q = quiz!.questions[currentQ] as MCQuestion;
    const isCorrect = optionIndex === q.correct;
    const result: QuizResult = {
      questionIndex: currentQ,
      correct: isCorrect,
      score: isCorrect ? 100 : 0,
      userAnswer: q.options[optionIndex],
    };
    setMcSelected(optionIndex);
    setCurrentResult(result);
  }, [quiz, currentQ, mcSelected]);

  const handleFreeEvaluate = useCallback(async () => {
    if (!freeText.trim() || evaluating) return;
    const q = quiz!.questions[currentQ] as FreeQuestion;
    setEvaluating(true);
    try {
      const res = await fetch('/api/quiz/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, model_answer: q.model_answer, user_answer: freeText }),
      });
      const data = await res.json();
      if (res.ok) {
        const result: QuizResult = {
          questionIndex: currentQ,
          correct: data.correct,
          score: data.score,
          feedback: data.feedback,
          userAnswer: freeText,
        };
        setCurrentResult(result);
      } else {
        setCurrentResult({ questionIndex: currentQ, correct: false, score: 0, feedback: 'Bewertung fehlgeschlagen.', userAnswer: freeText });
      }
    } catch {
      setCurrentResult({ questionIndex: currentQ, correct: false, score: 0, feedback: 'Netzwerkfehler.', userAnswer: freeText });
    } finally {
      setEvaluating(false);
    }
  }, [freeText, quiz, currentQ, evaluating]);

  const handleNext = useCallback(() => {
    if (!currentResult) return;
    const newResults = [...results, currentResult];
    setResults(newResults);
    setCurrentResult(null);
    setMcSelected(null);
    setFreeText('');

    const nextQ = currentQ + 1;
    if (nextQ >= (quiz?.questions.length || 0)) {
      // Save results
      if (typeof window !== 'undefined') {
        localStorage.setItem(RESULTS_KEY(chapterId), JSON.stringify(newResults));
      }
      setShowingSummary(true);
    } else {
      setCurrentQ(nextQ);
    }
  }, [currentResult, results, currentQ, quiz, chapterId]);

  const correctCount = results.filter(r => r.correct).length;
  const totalQ = quiz?.questions.length || 0;

  // ── Overlay ────────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        style={{
          width: '100%', padding: '10px', background: 'var(--navy, #1e3a5f)', color: 'white',
          border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 700, marginTop: '8px',
        }}
      >🧠 Wissen testen</button>
    );
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={modalStyle}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e3a5f' }}>
            🧠 Wissen testen — {chapterTitle}
          </h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}>✕</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            {error === 'api_key' && <p style={{ color: '#0369a1' }}>🔑 Claude API Key in <code>.env.local</code> eintragen für KI-Features</p>}
            {error === 'rate_limit' && <p style={{ color: '#b45309' }}>⏳ Bitte warte einen Moment...</p>}
            {error === 'generic' && <p style={{ color: '#dc2626' }}>❌ Quiz konnte nicht geladen werden</p>}
            <button onClick={() => loadQuiz()} style={actionBtnStyle}>Nochmal versuchen</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={spinnerStyle} />
            <p style={{ color: '#64748b', marginTop: '16px', fontSize: '14px' }}>Quiz wird generiert...</p>
          </div>
        )}

        {/* Summary */}
        {!loading && !error && showingSummary && (
          <SummaryView
            results={results}
            correctCount={correctCount}
            totalQ={totalQ}
            onRetry={() => { setShowingSummary(false); setCurrentQ(0); setResults([]); setCurrentResult(null); setMcSelected(null); setFreeText(''); }}
            onNew={() => loadQuiz(true)}
            onClose={handleClose}
          />
        )}

        {/* Question Card */}
        {!loading && !error && quiz && !showingSummary && (
          <QuestionCard
            question={quiz.questions[currentQ]}
            questionNum={currentQ + 1}
            totalQ={totalQ}
            mcSelected={mcSelected}
            freeText={freeText}
            setFreeText={setFreeText}
            evaluating={evaluating}
            currentResult={currentResult}
            onMCSelect={handleMCSelect}
            onFreeEvaluate={handleFreeEvaluate}
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function QuestionCard({
  question, questionNum, totalQ,
  mcSelected, freeText, setFreeText, evaluating, currentResult,
  onMCSelect, onFreeEvaluate, onNext,
}: {
  question: Question;
  questionNum: number;
  totalQ: number;
  mcSelected: number | null;
  freeText: string;
  setFreeText: (s: string) => void;
  evaluating: boolean;
  currentResult: QuizResult | null;
  onMCSelect: (i: number) => void;
  onFreeEvaluate: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
          <span>Frage {questionNum} von {totalQ}</span>
          <span>{question.type === 'mc' ? '🔘 Multiple Choice' : '✏️ Freitext'}</span>
        </div>
        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
          <div style={{ height: '100%', background: '#0284c7', borderRadius: '2px', width: `${(questionNum / totalQ) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Question */}
      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '16px', fontSize: '15px', lineHeight: 1.5 }}>
        {question.question}
      </p>

      {/* MC Options */}
      {question.type === 'mc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {(question as MCQuestion).options.map((opt, i) => {
            const isSelected = mcSelected === i;
            const isCorrect = (question as MCQuestion).correct === i;
            const showResult = mcSelected !== null;
            let bg = '#f8fafc';
            let border = '1px solid #e2e8f0';
            let color = '#1e293b';
            if (showResult) {
              if (isCorrect) { bg = '#dcfce7'; border = '1px solid #16a34a'; color = '#15803d'; }
              else if (isSelected && !isCorrect) { bg = '#fee2e2'; border = '1px solid #dc2626'; color = '#dc2626'; }
            } else if (isSelected) {
              bg = '#dbeafe'; border = '1px solid #3b82f6';
            }
            return (
              <button
                key={i}
                onClick={() => onMCSelect(i)}
                disabled={mcSelected !== null}
                style={{
                  padding: '10px 14px', borderRadius: '8px', border, background: bg, color,
                  cursor: mcSelected !== null ? 'default' : 'pointer',
                  textAlign: 'left', fontSize: '13px', fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {showResult && isCorrect && '✓ '}
                {showResult && isSelected && !isCorrect && '✗ '}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Free Text */}
      {question.type === 'free' && (
        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            disabled={!!currentResult}
            placeholder="Deine Antwort..."
            rows={3}
            style={{
              width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '13px', resize: 'vertical', fontFamily: 'inherit',
              background: currentResult ? '#f8fafc' : 'white', boxSizing: 'border-box',
            }}
          />
          {!currentResult && (
            <button
              onClick={onFreeEvaluate}
              disabled={evaluating || !freeText.trim()}
              style={{ ...actionBtnStyle, opacity: (evaluating || !freeText.trim()) ? 0.5 : 1 }}
            >
              {evaluating ? '⏳ Wird bewertet...' : '🔍 Prüfen'}
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {currentResult && (
        <div style={{
          padding: '12px', borderRadius: '8px', marginBottom: '16px',
          background: currentResult.correct ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${currentResult.correct ? '#16a34a' : '#dc2626'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: currentResult.feedback ? '6px' : 0 }}>
            <span style={{ fontSize: '16px' }}>{currentResult.correct ? '🎉' : '❌'}</span>
            <strong style={{ fontSize: '13px', color: currentResult.correct ? '#15803d' : '#dc2626' }}>
              {currentResult.correct ? 'Richtig!' : 'Nicht ganz...'}
              {currentResult.score !== undefined && ` (${currentResult.score}/100)`}
            </strong>
          </div>
          {currentResult.feedback && (
            <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>{currentResult.feedback}</p>
          )}
        </div>
      )}

      {/* Next button */}
      {currentResult && (
        <button onClick={onNext} style={{ ...actionBtnStyle, width: '100%' }}>
          Weiter →
        </button>
      )}
    </div>
  );
}

function SummaryView({ results, correctCount, totalQ, onRetry, onNew, onClose }: {
  results: QuizResult[];
  correctCount: number;
  totalQ: number;
  onRetry: () => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const pct = Math.round((correctCount / totalQ) * 100);
  const great = pct >= 80;
  const ok = pct >= 50;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{great ? '🎉' : ok ? '👍' : '📚'}</div>
      <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px', color: '#1e293b' }}>
        {correctCount}/{totalQ} richtig!
      </h3>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
        {great ? 'Ausgezeichnet! Du hast das Kapitel gut verstanden.' :
         ok ? 'Gut gemacht! Noch ein paar Punkte zum Wiederholen.' :
         'Lies das Kapitel nochmal in Ruhe durch.'}
      </p>
      {/* Score bar */}
      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '20px' }}>
        <div style={{
          height: '100%', borderRadius: '4px', transition: 'width 0.5s',
          background: great ? '#16a34a' : ok ? '#f59e0b' : '#dc2626',
          width: `${pct}%`,
        }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onRetry} style={actionBtnStyle}>🔄 Nochmal versuchen</button>
        <button onClick={onNew} style={{ ...actionBtnStyle, background: '#64748b' }}>✨ Neues Quiz</button>
        <button onClick={onClose} style={{ ...actionBtnStyle, background: '#94a3b8' }}>Schließen</button>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
};

const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '16px', padding: '24px',
  maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const actionBtnStyle: React.CSSProperties = {
  background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px',
  padding: '8px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
};

const spinnerStyle: React.CSSProperties = {
  width: '36px', height: '36px', border: '3px solid #e2e8f0',
  borderTop: '3px solid #0284c7', borderRadius: '50%',
  animation: 'spin 0.8s linear infinite', margin: '0 auto',
};
