'use client';

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface DrawingCanvasRef {
  getImageData: () => string | null;
  clear: () => void;
}

const COLORS = [
  { name: 'Schwarz', value: '#ffffff' }, // white on dark bg
  { name: 'Rot', value: '#f85149' },
  { name: 'Blau', value: '#58a6ff' },
  { name: 'Grün', value: '#3fb950' },
  { name: 'Gelb', value: '#d29922' },
];

const DrawingCanvas = forwardRef<DrawingCanvasRef>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [lineWidth, setLineWidth] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getImageData: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    },
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  }));

  // Resize canvas to fill container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Save current content
      const imageData = canvas.toDataURL();

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Fill with dark bg
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Restore content
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = imageData;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pos = getPos(e);
    lastPoint.current = pos;

    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (isEraser ? lineWidth * 3 : lineWidth) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? '#0d1117' : color;
    ctx.fill();
  }, [color, lineWidth, isEraser, getPos]);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPoint.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? '#0d1117' : color;
    ctx.lineWidth = isEraser ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Use pressure for line width if available (stylus support)
    if (e.pressure > 0 && e.pressure < 1) {
      ctx.lineWidth = (isEraser ? lineWidth * 3 : lineWidth) * (0.5 + e.pressure);
    }
    
    ctx.stroke();
    lastPoint.current = pos;
  }, [isDrawing, color, lineWidth, isEraser, getPos]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>✏️</span>
        
        {COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => { setColor(c.value); setIsEraser(false); }}
            title={c.name}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: c.value,
              border: color === c.value && !isEraser ? '2px solid var(--accent)' : '2px solid var(--border)',
              padding: 0,
            }}
          />
        ))}

        <button
          onClick={() => setIsEraser(!isEraser)}
          style={{
            padding: '0.25rem 0.5rem',
            background: isEraser ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            color: isEraser ? 'var(--accent)' : 'var(--text-secondary)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            border: '1px solid var(--border)',
          }}
        >
          🧹
        </button>

        <select
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          style={{
            padding: '0.2rem 0.3rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.75rem',
          }}
        >
          <option value={1}>Dünn</option>
          <option value={2}>Normal</option>
          <option value={4}>Dick</option>
          <option value={8}>Extra Dick</option>
        </select>

        <button
          onClick={handleClear}
          style={{
            padding: '0.25rem 0.5rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            border: '1px solid var(--border)',
            marginLeft: 'auto',
          }}
        >
          🗑 Löschen
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: isEraser ? 'cell' : 'crosshair',
          }}
        />
      </div>
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
