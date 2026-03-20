'use client';

import { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
  onScreenshotTaken?: (screenshot: string) => void;
}

export function DrawingCanvas({ onScreenshotTaken }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, []);

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = getContext();
    if (!ctx) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const clientX =
      'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const ctx = getContext();
    if (!ctx) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const clientX =
      'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = getContext();
    if (ctx) {
      ctx.closePath();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  };

  const takeScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL('image/png');
    if (onScreenshotTaken) {
      onScreenshotTaken(imageData);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '1rem',
          borderBottom: `1px solid var(--border)`,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Title */}
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', flex: 1 }}>
          ✏️ Zeichenbereich
        </h3>

        {/* Color Picker */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {(['#ffffff', '#ef4444', '#3b82f6', '#10b981'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: c,
                border: color === c ? `2px solid var(--accent)` : `1px solid var(--border)`,
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
              title={c}
            />
          ))}
        </div>

        {/* Line Width */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
            htmlFor="linewidth"
          >
            Breite
          </label>
          <input
            id="linewidth"
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{
              width: '80px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {lineWidth}
          </span>
        </div>

        {/* Clear Button */}
        <button
          onClick={clearCanvas}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-tertiary)',
            border: `1px solid var(--border)`,
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--error)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = 'var(--error)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          🗑️ Löschen
        </button>

        {/* Screenshot Button */}
        <button
          onClick={takeScreenshot}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--success)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.1s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          📸 An Tutor senden
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          flex: 1,
          display: 'block',
          cursor: 'crosshair',
          touchAction: 'none',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
