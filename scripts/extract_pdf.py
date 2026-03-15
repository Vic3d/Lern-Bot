#!/usr/bin/env python3
"""
PDF Text Extraction via pdfplumber — AKAD-optimiert v5
- within_bbox() schneidet Header (y<5%) und Footer (y>88%) weg
- 2x UND 4x Encoding erkannt (AKAD-Überschriften)
- Kapitel-Headings: top-level (Tiefe 0-1) → Chapter-Split
- Sub-Headings (Tiefe 2+): als leere Zeile im Body (nicht laut vorgelesen via Marker)
- Fußzeilen-Patterns: "Kapitel N", Modul-Codes → gefiltert
"""
import sys, json, re
import pdfplumber


# ── Encoding (2x und 4x) ─────────────────────────────────────────────────────────

def decode_nx(text: str, n: int) -> str:
    result, i = [], 0
    while i < len(text):
        c, count = text[i], 1
        while i + count < len(text) and text[i + count] == c:
            count += 1
        result.append(c if count >= n else c * count)
        i += count
    return ''.join(result)


def detect_decode(text: str):
    """Gibt (is_encoded, decoded) zurück. Erkennt 4x und 2x."""
    if re.search(r'(.)\1{3}', text):
        return True, decode_nx(text, 4)
    if len(text) >= 6:
        t = text if len(text) % 2 == 0 else text[:-1]
        pm = sum(1 for i in range(0, len(t)-1, 2) if t[i] == t[i+1])
        if pm / (len(t) // 2) > 0.65:
            return True, decode_nx(text, 2)
    return False, text


# ── Noise ────────────────────────────────────────────────────────────────────────

def is_noise(line: str) -> bool:
    l = line.strip()
    if not l or len(l) < 2: return True
    if re.match(r'^-?\s*\d{1,4}\s*-?$', l): return True          # Seitenzahlen
    if re.match(r'^(Seite|Page)\s+\d+', l, re.IGNORECASE): return True
    if l in ('å', '©', '®', '™', '•', '◦', '–', '—'): return True
    if re.match(r'^Kapitel\s*\d+', l, re.IGNORECASE): return True  # "Kapitel 1" Footer
    if re.match(r'^[A-Z]{2,4}\d{3,4}$', l): return True           # TME102 etc.
    return False


# ── Heading-Klassifizierung ──────────────────────────────────────────────────────

# Top-Level (Tiefe 0 oder 1): "1 Titel" oder "1.1 Titel" oder benannte Headings
TOP_HEADING_RE = re.compile(
    r'^(\d+(?:\.\d+)?\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,/\-(\.]{2,80}'
    r'|Einleitung(?:\s*(?:und|/)\s*Lernziele)?'
    r'|Zusammenfassung|Lernziele)$'
)

# Sub-Level (Tiefe 2+): "1.1.1 Titel"
SUB_HEADING_RE = re.compile(
    r'^\d+\.\d+\.\d+(?:\.\d+)?\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,/\-(\.]{2,60}$'
)

PURE_NUMBER_RE = re.compile(r'^\d+(?:\.\d+)*$')


def classify(raw_line: str):
    """
    Gibt (kind, text) zurück.
    kind: 'chapter_heading' | 'sub_heading' | 'heading_num' | 'body' | 'noise'
    """
    line = raw_line.strip()
    if not line or is_noise(line):
        return 'noise', line

    is_enc, decoded = detect_decode(line)

    if is_enc:
        decoded = decoded.strip()
        if not decoded: return 'noise', line
        # Reine Zahl → Heading-Prefix
        if PURE_NUMBER_RE.match(decoded):
            return 'heading_num', decoded
        # Trailing Seitenzahl entfernen
        clean = re.sub(r'\s+\d+\s*$', '', decoded).strip()
        if TOP_HEADING_RE.match(clean):
            return 'chapter_heading', clean
        if SUB_HEADING_RE.match(clean):
            return 'sub_heading', clean
        return 'body', decoded

    return 'body', line


# ── Seiten-Extraktion ────────────────────────────────────────────────────────────

def extract_page_text(page):
    """Gibt [(kind, text)] zurück, gefiltert per within_bbox."""
    page_h = float(page.height)
    page_w = float(page.width)
    if page_h == 0: return []

    top = page_h * 0.05
    bottom = page_h * 0.88

    try:
        body = page.within_bbox((0, top, page_w, bottom))
        text = body.extract_text(x_tolerance=3, y_tolerance=3) or ''
    except Exception:
        text = page.extract_text() or ''

    lines = []
    pending_num = None

    for raw_line in text.split('\n'):
        kind, content = classify(raw_line)

        if kind == 'noise':
            continue

        if kind == 'heading_num':
            pending_num = content
            continue

        if pending_num is not None:
            # Kombiniere Nummer + nächste kodierte Zeile zu Heading
            if kind in ('chapter_heading', 'sub_heading', 'body') and detect_decode(raw_line.strip())[0]:
                combined = f"{pending_num} {content}".strip()
                clean = re.sub(r'\s+\d+\s*$', '', combined)
                if TOP_HEADING_RE.match(clean):
                    lines.append(('chapter_heading', clean))
                elif SUB_HEADING_RE.match(clean):
                    lines.append(('sub_heading', clean))
                else:
                    lines.append(('body', combined))
            else:
                lines.append(('body', pending_num))
                lines.append((kind, content))
            pending_num = None
            continue

        lines.append((kind, content))

    if pending_num is not None:
        lines.append(('body', pending_num))

    return lines


# ── PDF verarbeiten ──────────────────────────────────────────────────────────────

def process_pdf(pdf_path: str):
    all_items = []
    num_pages = 0
    with pdfplumber.open(pdf_path) as pdf:
        num_pages = len(pdf.pages)
        # Erste Seite überspringen wenn Cover-Seite (sehr wenig Text)
        start_page = 0
        for i, page in enumerate(pdf.pages[:3]):
            t = page.extract_text() or ''
            if len(t.split()) > 80:
                start_page = i
                break

        for page_num, page in enumerate(pdf.pages, 1):
            if page_num <= start_page:
                continue
            for kind, text in extract_page_text(page):
                all_items.append((page_num, kind, text))
    return all_items, num_pages


# ── Kapitel-Splitting ────────────────────────────────────────────────────────────

def build_chapters(all_items, num_pages):
    chapters = []
    current_title = 'Einleitung'
    current_items = []
    chapter_num = 0

    def flush():
        nonlocal chapter_num
        if not current_items: return
        pages = [p for p, _ in current_items]
        # Sub-Headings als lesbare Abschnittsmarker behalten, aber gedämpft
        parts = []
        for _, t in current_items:
            parts.append(t)
        body = '\n'.join(parts).strip()
        wc = len(body.split())
        if wc < 30: return
        chapter_num += 1
        chapters.append({
            'chapter_num': chapter_num,
            'title': current_title,
            'text': body,
            'word_count': wc,
            'duration_seconds': round(wc / 2.5),
            'start_page': min(pages),
            'end_page': max(pages),
        })

    for page_num, kind, text in all_items:
        if kind == 'chapter_heading':
            flush()
            current_title = text
            current_items = []
        elif kind == 'sub_heading':
            # Sub-Headings nicht als Text ausgeben (TTS liest sie sonst vor)
            # Leerzeile als Abstandhalter
            current_items.append((page_num, ''))
        else:
            current_items.append((page_num, text))

    flush()

    # Mini-Kapitel (<150 Wörter) mit nächstem zusammenführen
    merged = []
    for ch in chapters:
        if merged and merged[-1]['word_count'] < 150:
            prev = merged[-1]
            prev['text'] += '\n' + ch['text']
            prev['word_count'] += ch['word_count']
            prev['duration_seconds'] = round(prev['word_count'] / 2.5)
            prev['end_page'] = ch['end_page']
        else:
            merged.append(ch)

    for i, ch in enumerate(merged):
        ch['chapter_num'] = i + 1
    return merged


def build_chunks(all_items, num_pages, chunk_size=1500):
    all_words, word_pages = [], []
    for page_num, _, text in all_items:
        ws = text.split()
        all_words.extend(ws)
        word_pages.extend([page_num] * len(ws))
    chapters = []
    for i in range(0, len(all_words), chunk_size):
        cw = all_words[i:i+chunk_size]
        cp = word_pages[i:i+chunk_size]
        num = i // chunk_size + 1
        chapters.append({
            'chapter_num': num, 'title': f'Teil {num}', 'text': ' '.join(cw),
            'word_count': len(cw), 'duration_seconds': round(len(cw) / 2.5),
            'start_page': cp[0] if cp else 1, 'end_page': cp[-1] if cp else num_pages,
        })
    return chapters


# ── Main ─────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: extract_pdf.py <pdf_path>'}))
        sys.exit(1)

    try:
        all_items, num_pages = process_pdf(sys.argv[1])
        chapters = build_chapters(all_items, num_pages)
        if len(chapters) <= 1:
            chapters = build_chunks(all_items, num_pages)

        print(json.dumps({
            'success': True,
            'pages': num_pages,
            'total_chars': sum(ch['word_count'] * 5 for ch in chapters),
            'chapters_count': len(chapters),
            'chapters': chapters,
        }, ensure_ascii=False))

    except Exception as e:
        import traceback
        print(json.dumps({'success': False, 'error': str(e), 'trace': traceback.format_exc()}))
        sys.exit(1)
