#!/usr/bin/env python3
"""
PDF Text Extraction via pdfplumber
Strategie 1: TOC-basiert (erkennt Inhaltsverzeichnis → echte Titel + Seiten)
Strategie 2: Heading-Pattern mit 4x-Decode (AKAD-spezifisch)
Strategie 3: Wort-Chunk-Fallback
"""
import sys, json, re
import pdfplumber


# ── Hilfsfunktionen ─────────────────────────────────────────────────────────────

def is_noise(line):
    l = line.strip()
    if not l or len(l) < 2: return True
    if re.match(r'^-?\s*\d{1,3}\s*-?$', l): return True
    if re.match(r'^(Seite|Page)\s+\d+', l, re.IGNORECASE): return True
    return False


def clean_title(t):
    t = re.sub(r'\s+\d+\s*$', '', t.strip())
    return re.sub(r'\s+', ' ', t).strip()


def decode_4x(text):
    """SSSSttttaaaattttiiiikkkk → Statik"""
    if not text: return text
    result, i = [], 0
    while i < len(text):
        c, count = text[i], 1
        while i + count < len(text) and text[i + count] == c:
            count += 1
        result.append(c if count >= 4 else c * count)
        i += count
    return ''.join(result)


def maybe_decode(line):
    if re.search(r'(.)\1{3}', line):
        return decode_4x(line)
    return line


# ── Strategie 1: TOC-Erkennung ──────────────────────────────────────────────────
# TOC-Zeile: "(Nummer) Titel Seitenzahl"  z.B. "1.1 Tragelemente ebener Systeme 5"

TOC_RE = re.compile(r'^(?:(\d+(?:\.\d+)*)\s+)?(.+?)\s+(\d{1,3})\s*$')


def parse_toc_line(line):
    m = TOC_RE.match(line.strip())
    if not m: return None
    number, title, page = m.group(1) or '', m.group(2).strip(), int(m.group(3))
    if len(title) < 3 or not re.search(r'[A-Za-zÄÖÜäöüß]', title): return None
    # Titel darf nicht selbst eine Zahl sein
    if re.match(r'^\d+$', title): return None
    return (number, title, page)


def detect_toc(pdf):
    """Sucht TOC in ersten 5 Seiten. Gibt [(number, title, page), ...] zurück."""
    for page in pdf.pages[:5]:
        text = page.extract_text() or ''
        raw_lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Mehrzeilige TOC-Einträge zusammenführen
        joined = []
        for line in raw_lines:
            # Fortsetzung: keine führende Zahl, keine Schlüsselwörter, vorherige endet nicht auf Zahl
            if (joined
                    and not re.match(r'^\d', line)
                    and not re.match(r'^(Einleitung|Zusammenfassung|Lernziele)', line)
                    and not re.search(r'\d+\s*$', joined[-1])):
                joined[-1] += ' ' + line
            else:
                joined.append(line)

        entries = [e for e in (parse_toc_line(l) for l in joined) if e]

        if len(entries) >= 4:
            pages = [e[2] for e in entries]
            # Seitenzahlen müssen nicht-absteigend sein
            if all(pages[i] <= pages[i+1] for i in range(len(pages)-1)):
                return entries
    return []


def build_chapters_from_toc(pdf, toc, num_pages):
    """Nutzt TOC-Seitengrenzen um Kapitel zu extrahieren."""
    # Nur Top-Level (Tiefe 0 oder 1: "1", "1.1", "Einleitung")
    top = [(n, t, p) for n, t, p in toc if n.count('.') <= 1]
    if not top:
        top = toc[:20]

    chapters = []
    for i, (number, title, start_p) in enumerate(top):
        end_p = top[i+1][2] - 1 if i+1 < len(top) else num_pages
        end_p = max(end_p, start_p)

        body_lines = []
        for p_idx in range(start_p - 1, min(end_p, num_pages)):
            t = pdf.pages[p_idx].extract_text() or ''
            for line in t.split('\n'):
                if not is_noise(line) and line.strip():
                    body_lines.append(line.strip())

        body = '\n'.join(body_lines).strip()
        wc = len(body.split())
        full_title = (f"{number} {title}".strip() if number else title)

        chapters.append({
            'chapter_num': i + 1,
            'title': clean_title(full_title),
            'text': body,
            'word_count': wc,
            'duration_seconds': round(max(wc, 1) / 2.5),
            'start_page': start_p,
            'end_page': end_p,
        })

    # Mini-Kapitel (< 150 Wörter) mit nächstem zusammenführen
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

    return [ch for ch in merged if ch['word_count'] > 30]


# ── Strategie 2: Heading-Pattern (mit 4x-Decode) ────────────────────────────────

HEADING_RE = re.compile(
    r'^(\d+\.?\d*\.?\d*\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,/\-]{2,80}'
    r'|Einleitung(?:\s*/\s*Lernziele)?|Einleitung\s*und\s*Lernziele'
    r'|Zusammenfassung|Lernziele)$'
)


def build_chapters_from_headings(pdf, num_pages):
    chapters, current_title, current_items, chapter_num = [], 'Einleitung', [], 0

    for p_idx in range(num_pages):
        page_text = pdf.pages[p_idx].extract_text() or ''
        for raw_line in page_text.split('\n'):
            if is_noise(raw_line): continue
            line = maybe_decode(raw_line.strip())
            if not line: continue
            page_num = p_idx + 1

            body_so_far = ' '.join(t for _, t in current_items)
            if HEADING_RE.match(clean_title(line)) and len(body_so_far) > 300:
                if current_items:
                    chapter_num += 1
                    pages = [p for p, _ in current_items]
                    body = '\n'.join(t for _, t in current_items).strip()
                    wc = len(body.split())
                    chapters.append({
                        'chapter_num': chapter_num,
                        'title': clean_title(current_title),
                        'text': body,
                        'word_count': wc,
                        'duration_seconds': round(wc / 2.5),
                        'start_page': min(pages),
                        'end_page': max(pages),
                    })
                current_title = clean_title(line)
                current_items = []
            else:
                current_items.append((page_num, line))

    if current_items:
        chapter_num += 1
        pages = [p for p, _ in current_items]
        body = '\n'.join(t for _, t in current_items).strip()
        wc = len(body.split())
        chapters.append({
            'chapter_num': chapter_num,
            'title': clean_title(current_title),
            'text': body,
            'word_count': wc,
            'duration_seconds': round(wc / 2.5),
            'start_page': min(pages) if pages else 1,
            'end_page': max(pages) if pages else num_pages,
        })

    return chapters


# ── Strategie 3: Wort-Chunks ─────────────────────────────────────────────────────

def build_chapters_from_words(pdf, num_pages, chunk_size=1500):
    all_words, word_pages = [], []
    for p_idx in range(num_pages):
        t = pdf.pages[p_idx].extract_text() or ''
        for line in t.split('\n'):
            if not is_noise(line):
                ws = line.strip().split()
                all_words.extend(ws)
                word_pages.extend([p_idx + 1] * len(ws))

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

    pdf_path = sys.argv[1]
    strategy = 'unknown'

    try:
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)

            toc = detect_toc(pdf)
            if toc:
                chapters = build_chapters_from_toc(pdf, toc, num_pages)
                strategy = 'toc'

            if not toc or len(chapters) <= 1:
                chapters = build_chapters_from_headings(pdf, num_pages)
                strategy = 'headings'

            if len(chapters) <= 1:
                chapters = build_chapters_from_words(pdf, num_pages)
                strategy = 'word_chunks'

            result = {
                'success': True,
                'pages': num_pages,
                'total_chars': sum(ch['word_count'] * 5 for ch in chapters),
                'chapters_count': len(chapters),
                'strategy': strategy,
                'chapters': chapters,
            }
            print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        import traceback
        print(json.dumps({'success': False, 'error': str(e), 'trace': traceback.format_exc()}))
        sys.exit(1)
