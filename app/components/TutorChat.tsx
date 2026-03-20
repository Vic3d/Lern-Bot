'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import RemarkMath from 'remark-math';
import RehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorChatProps {
  kapitelText: string;
  onCanvasClick: () => void;
}

export function TutorChat({ kapitelText, onCanvasClick }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickPrompts = [
    { emoji: '📖', text: 'Erkläre dieses Kapitel', prompt: 'Erkläre mir verständlich das aktuelle Kapitel. Nutze Beispiele und Visualisierungen.' },
    { emoji: '📝', text: 'Stelle mir eine Aufgabe', prompt: 'Gib mir eine schwierige, realistische Aufgabe zum aktuellen Kapitel, wie sie in einer Prüfung vorkommen könnte.' },
    { emoji: '🎯', text: 'Prüfe meine Lösung', prompt: 'Ich habe eine Aufgabe versucht zu lösen. Bitte überprüfe meine Lösung kritisch und gib mir Feedback.' },
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          kapitelText,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const data = JSON.parse(line.slice(5));
            if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
              assistantContent += data.delta.text;
              setMessages((prev) => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1].content = assistantContent;
                } else {
                  updated.push({ role: 'assistant', content: assistantContent });
                }
                return updated;
              });
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Fehler beim Abrufen der Antwort. Bitte versuchen Sie es später erneut.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div
      style={{
        width: '60%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderLeft: `1px solid var(--border)`,
      }}
    >
      {/* Chat Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ fontSize: '3rem', margin: 0 }}>🤖</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>Albert hier</p>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Starte die Konversation mit einem Klick unten</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'var(--user-bubble)' : 'var(--assistant-bubble)',
                  color: 'var(--text-secondary)',
                  padding: '1rem',
                  borderRadius: '12px',
                  borderTopLeftRadius: msg.role === 'user' ? '12px' : '4px',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                }}
              >
                {msg.role === 'assistant' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown
                      remarkPlugins={[RemarkMath]}
                      rehypePlugins={[RehypeKatex]}
                      components={{
                        p: ({ children }) => <p style={{ margin: '0.3em 0' }}>{children}</p>,
                        ul: ({ children }) => (
                          <ul style={{ margin: '0.3em 0', marginLeft: '1.2em' }}>{children}</ul>
                        ),
                        li: ({ children }) => <li style={{ margin: '0.2em 0' }}>{children}</li>,
                        code: ({ children }) => (
                          <code style={{
                            background: 'var(--bg-tertiary)',
                            padding: '0.1em 0.3em',
                            borderRadius: '3px',
                            fontSize: '0.9em',
                          }}>
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                background: 'var(--assistant-bubble)',
                padding: '1rem',
                borderRadius: '12px',
                borderTopLeftRadius: '4px',
                display: 'flex',
                gap: '0.3rem',
              }}
            >
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid var(--border)`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPrompt(q.prompt)}
              disabled={loading}
              style={{
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                border: `1px solid var(--border)`,
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--accent-light)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {q.emoji} {q.text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '1.5rem',
          borderTop: `1px solid var(--border)`,
          display: 'flex',
          gap: '0.75rem',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading) {
              sendMessage(input);
            }
          }}
          placeholder="Stelle deine Frage..."
          disabled={loading}
          style={{
            flex: 1,
            background: 'var(--bg-tertiary)',
            border: `1px solid var(--border)`,
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            opacity: loading ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? 'var(--text-muted)' : 'var(--accent)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.background = 'var(--accent-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.background = 'var(--accent)';
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
