'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Chapter } from '../types';
import { renderMarkdownWithLatex } from '../lib/renderLatex';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageData?: string; // base64 canvas image
}

interface Props {
  chapter: Chapter | null;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  onSendCanvasImage?: () => string | null; // returns base64 or null
}

export default function TutorChat({ chapter, initialPrompt, onClearInitialPrompt, onSendCanvasImage }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Handle initial prompt (e.g. "Erkläre dieses Kapitel")
  useEffect(() => {
    if (initialPrompt && chapter && !isStreaming) {
      sendMessage(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, chapter]);

  const sendMessage = useCallback(async (text: string, imageData?: string) => {
    if (!text.trim() && !imageData) return;
    if (isStreaming) return;

    const userMessage: Message = { role: 'user', content: text, imageData };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Build API messages
    const apiMessages = newMessages.map(m => {
      if (m.imageData) {
        return {
          role: m.role,
          content: [
            { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: m.imageData.replace(/^data:image\/\w+;base64,/, '') } },
            { type: 'text' as const, text: m.content || 'Hier ist meine Zeichnung. Bitte analysiere sie.' },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          chapterContext: chapter ? {
            titel: chapter.titel,
            skript: chapter.skript,
            text: chapter.text,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'API Error');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantText };
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Fehler: ${err.message}\n\nStelle sicher dass ANTHROPIC_API_KEY in .env.local gesetzt ist.` }
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, chapter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTTS = async (text: string) => {
    // Strip markdown/latex for TTS
    const clean = text
      .replace(/\$\$[\s\S]*?\$\$/g, ' Formel ')
      .replace(/\$[^\$]+?\$/g, ' Formel ')
      .replace(/[#*_`>]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    // Try Web Speech API
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendCanvas = () => {
    if (onSendCanvasImage) {
      const data = onSendCanvasImage();
      if (data) {
        sendMessage('Hier ist meine Zeichnung/Lösung. Bitte analysiere und gib mir Feedback:', data);
      }
    }
  };

  const quickActions = [
    { label: '📖 Erkläre dieses Kapitel', prompt: 'Erkläre mir dieses Kapitel Schritt für Schritt. Beginne mit dem Wichtigsten und nutze anschauliche Beispiele.' },
    { label: '📝 Stelle mir eine Aufgabe', prompt: 'Stelle mir eine typische Klausuraufgabe zu diesem Kapitel. Beschreibe die Situation genau und sag mir was ich zeichnen/berechnen soll.' },
    { label: '✅ Prüfe meine Lösung', prompt: 'Ich möchte meine Lösung überprüfen. Stelle mir Fragen zu meinem Lösungsweg.' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
    }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '1rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '2rem',
          }}>
            <span style={{ fontSize: '3rem' }}>🎓</span>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>TM Tutor</h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '400px' }}>
              {chapter
                ? `Bereit für "${chapter.titel}". Stell mir eine Frage oder nutze die Schnellbuttons unten.`
                : 'Wähle ein Kapitel links und starte dann eine Unterhaltung.'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {msg.imageData && (
              <img
                src={msg.imageData}
                alt="Canvas"
                style={{
                  maxWidth: '300px',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--border)',
                }}
              />
            )}
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
            }}>
              {msg.role === 'user' ? (
                <span>{msg.content}</span>
              ) : (
                <div
                  className="chat-markdown"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLatex(msg.content || '') }}
                />
              )}
            </div>
            {msg.role === 'assistant' && msg.content && (
              <button
                onClick={() => handleTTS(msg.content)}
                style={{
                  marginTop: '0.25rem',
                  padding: '0.2rem 0.5rem',
                  background: 'none',
                  color: isSpeaking ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                {isSpeaking ? '⏹ Stop' : '🔊 Vorlesen'}
              </button>
            )}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem 1rem' }}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '0.5rem 1rem 0',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => sendMessage(action.prompt)}
            disabled={isStreaming || !chapter}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              borderRadius: '20px',
              fontSize: '0.75rem',
              border: '1px solid var(--border)',
              opacity: isStreaming || !chapter ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {action.label}
          </button>
        ))}
        {onSendCanvasImage && (
          <button
            onClick={handleSendCanvas}
            disabled={isStreaming}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              borderRadius: '20px',
              fontSize: '0.75rem',
              border: '1px solid var(--border)',
              opacity: isStreaming ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            📸 Canvas an Tutor
          </button>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem 1rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end',
        borderTop: '1px solid var(--border)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chapter ? 'Frag den Tutor...' : 'Wähle zuerst ein Kapitel'}
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            padding: '0.65rem 1rem',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '0.9rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isStreaming || (!input.trim())}
          style={{
            padding: '0.65rem 1rem',
            background: isStreaming || !input.trim() ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isStreaming || !input.trim() ? 'var(--text-muted)' : 'white',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 600,
            minWidth: '44px',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
