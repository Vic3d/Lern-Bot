#!/usr/bin/env python3
"""
PDF Text Extraction via pdfplumber — AKAD-optimiert v4
- within_bbox() schneidet Header (y<5%) und Footer (y>88%) weg
- extract_text() gibt korrekte Leerzeichen auch in 4x-kodierten Überschriften
- Heading-Erkennung: 4x-kodierte Zeilen → decode → echte Titel
- Nummer-Zeilen ("1111" → "1") + Titel-Zeile werden kombiniert
"""
import sys, json, re
import pdfplumber


# ── 4x-Encoding ─────────────────────────────────────────────────────────────────

def decode_4x(text: str) -> str:
    """SSSSttttaaaattttiiiikkkk → Statik"""
    result, i = [], 0
    while i < len(text):
        c, count = text[i], 1
        while i + count < len(text) and text[i + count] == c:
            count += 1
        result.append(c if count >= 4 else c * count)
        i += count
    return ''.join(result)


def is_4x_encoded(text: str) -> bool:
    # Mind. 4 gleiche Zeichen hintereinander
    return bool(re.search(r'(.)\1{3}', text))


# ── Zeilen-Klassifizierung ────────────────────────────────────────────────────────

def is_noise(line: str) -> bool:
    l = line.strip()
    if not l or len(l) < 2: return True
    if re.match(r'^-?\s*\d{1,4}\s*-?$', l): return True
    if re.match(r'^(Seite|Page)\s+\d+', l, re.IGNORECASE): return True
    if l in ('å', '©', '®', '™', '•', '◦', '–', '—'): return True
    return False


# Kapitel-Überschriften-Muster (nach Dekodierung), max Tiefe 1
CHAPTER_RE = re.compile(
    r'^('
    r'\d+(?:\.\d+)?\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,/\-(\.]{2,80}'
    r'|Einleitung(?:\s*(?:und|/)\s*Lernziele)?'
    r'|Zusammenfassung|Lernziele'
    r')$'
)

PURE_NUMBER_RE = re.compile(r'^\d+(?:\.\d+)?$')


def classify(raw_line: str):
    """
    Gibt (kind, text) zurück.
    kind: 'chapter_heading' | 'section_heading' | 'body' | 'noise'
    text: bereinigter Text (ggf. dekodiert)
    """
    line = raw_line.strip()
    if not line or is_noise(line):
        return 'noise', line

    if is_4x_encoded(line):
        decoded = decode_4x(line).strip()
        if not decoded: return 'noise', line
        # Reine Zahl → mögliches Heading-Prefix
        if PURE_NUMBER_RE.match(decoded):
            return 'heading_num', decoded
        # Kapitel-Überschrift?
        clean = re.sub(r'\s+\d+\s*$', '', decoded)  # trailing Seitenzahl entfernen
        if CHAPTER_RE.match(clean):
            return 'chapter_heading', clean
        # Tiefe 2+: nicht als Kapitel, aber als Body
        return 'body', decoded

    return 'body', line


# ── Seiten-Extraktion ────────────────────────────────────────────────────────────

def extract_page_text(page):
    """
    Gibt Liste von (kind, text) pro Zeile zurück.
    Filtert Header/Footer via within_bbox.
    """
    page_h = float(page.height)
    page_w = float(page.width)
    if page_h == 0: return []

    # Body-Bereich: 5% bis 88%
    top = page_h * 0.05
    bottom = page_h * 0.88
    try:
        body = page.within_bbox((0, top, page_w, bottom))
        text = body.extract_text(x_tolerance=3, y_tolerance=3) or ''
    except Exception:
        text = page.extract_text() or ''

    lines = []
    pending_num = None  # Für Nummer-Zeilen ("1", "1.1") die mit nächster Zeile kombiniert werden

    for raw_line in text.split('\n'):
        kind, content = classify(raw_line)

        if kind == 'noise':
            continue

        if kind == 'heading_num':
            pending_num = content
            continue

        if pending_num is not None:
            if kind == 'chapter_heading':
                combined = f"{pending_num} {content}"
                if CHAPTER_RE.match(combined):
                    lines.append(('chapter_heading', combined))
                else:
                    lines.append(('chapter_heading', content))
            elif kind == 'body' and is_4x_encoded(raw_line.strip()):
                # 4x body + pending number → heading attempt
                combined = f"{pending_num} {content}"
                if CHAPTER_RE.match(combined):
                    lines.append(('chapter_heading', combined))
                else:
                    lines.append(('body', content))
            else:
                # Zahl hatte keinen Heading-Folger → als Body ausgeben
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
        for page_num, page in enumerate(pdf.pages, 1):
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
        body = '\n'.join(t for _, t in current_items).strip()
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
        else:
            current_items.append((page_num, text))

    flush()

    # Mini-Kapitel (<200 Wörter) mit nächstem zusammenführen
    merged = []
    for ch in chapters:
        if merged and merged[-1]['word_count'] < 200:
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
            'chapter_num': num,
            'title': f'Teil {num}',
            'text': ' '.join(cw),
            'word_count': len(cw),
            'duration_seconds': round(len(cw) / 2.5),
            'start_page': cp[0] if cp else 1,
            'end_page': cp[-1] if cp else num_pages,
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
