import katex from 'katex';

/**
 * Render a markdown string with LaTeX to HTML string.
 * Handles $$...$$ (display) and $...$ (inline) math.
 */
export function renderMarkdownWithLatex(text: string): string {
  if (!text) return '';
  
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Display math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return '<code>' + tex + '</code>';
    }
  });

  // Inline math $...$
  html = html.replace(/\$([^\$\n]+?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return '<code>' + tex + '</code>';
    }
  });

  // Markdown formatting
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = '<p>' + html + '</p>';
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

/**
 * Post-process a DOM element to render any LaTeX in it.
 */
export function renderLatex(element: HTMLElement) {
  const html = element.innerHTML;
  let processed = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return '<code>' + tex + '</code>';
    }
  });
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return '<code>' + tex + '</code>';
    }
  });
  element.innerHTML = processed;
}
