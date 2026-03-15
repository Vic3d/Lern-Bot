#!/usr/bin/env python3
"""
PDF Text Extraction — AKAD-optimiert (v3)
Strategie:
 1. TOC aus extract_text() lesen → echte Titel mit Leerzeichen
 2. Char-Level-Scan → 4x/2x-kodierte Zeilen finden → Seite + Y-Position der Überschriften
 3. Jede kodierte Überschrift per normalisiertem Match dem TOC-Eintrag zuordnen
 4. Footer (y>88%) + Header (y<5%) + Schriftgröße<9pt → filtern
"""
import sys, json, re
import pdfplumber


# ── Decoding ─────────────────────────────────────────────────────────────────────

def decode_nx(text: str, n: int) -> str:
    result, i = [], 0
    while i < len(text):
        c, count = text[i], 1
        while i + count < len(text) and text[i + count] == c:
            count += 1
        result.append(c if count >= n else c * count)
        i += count
    return ''.join(result)


def detect_and_decode(text: str):
    """Gibt (decoded, encoding_type) zurück oder (text, None) wenn nicht kodiert."""
    # 4x
    if re.search(r'(.)\1{3}', text):
        return decode_nx(text, 4), '4x'
    # 2x: Zeichenpaare an geraden Indices (0,1), (2,3)...
    if len(text) >= 6:
        t = text if len(text) % 2 == 0 else text[:-1]
        pairs_match = sum(1 for i in range(0, len(t) - 1, 2) if t[i] == t[i + 1])
        if pairs_match / (len(t) // 2) > 0.65:
            return decode_nx(text, 2), '2x'
    return text, None


def norm(s: str) -> str:
    """Normalisiert für Matching: lowercase, keine Spaces, keine Sonderzeichen."""
    return re.sub(r'[^a-zäöüß\d]', '', s.lower())


# ── TOC-Extraktion (korrekte Titel mit Leerzeichen) ──────────────────────────────

TOC_LINE_RE = re.compile(r'^(?:(\d+(?:\.\d+)*)\s+)?(.+?)\s+(\d{1,3})\s*$')


def extract_toc(pdf):
    """
    Liest TOC aus den ersten 5 Seiten.
    Gibt Dict zurück: norm(title_no_spaces) → (number, proper_title, start_page)
    """
    mapping = {}

    for page in pdf.pages[:5]:
        text = page.extract_text() or ''
        raw_lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Mehrzeilige Einträge zusammenführen
        joined = []
        for line in raw_lines:
            if (joined
                    and not re.match(r'^\d', line)
                    and not re.match(r'^(Einleitung|Zusammenfassung|Lernziele)', line)
                    and not re.search(r'\d+\s*$', joined[-1])):
                joined[-1] += ' ' + line
            else:
                joined.append(line)

        entries = []
        for line in joined:
            m = TOC_LINE_RE.match(line)
            if not m: continue
            number, title, page_num = m.group(1) or '', m.group(2).strip(), int(m.group(3))
            if len(title) < 3 or not re.search(r'[A-Za-zÄÖÜäöüß]', title): continue
            if re.match(r'^\d+$', title): continue
            entries.append((number, title, page_num))

        if len(entries) >= 4:
            pages = [e[2] for e in entries]
            if all(pages[i] <= pages[i+1] for i in range(len(pages)-1)):
                for number, title, page_num in entries:
                    key = norm(title)
                    full = f"{number} {title}".strip() if number else title
                    # Trailing Seitenzahl entfernen
                    full = re.sub(r'\s+\d+\s*$', '', full).strip()
                    mapping[key] = (number, full, page_num)
                return mapping

    return mapping


# ── Heading-Scan (Char-Level) ────────────────────────────────────────────────────

def scan_headings(pdf, toc_map):
    """
    Scannt alle Seiten nach 4x/2x-kodierten Zeilen.
    Kombiniert aufeinanderfolgende Nummer+Titel-Zeilen.
    Gibt Liste von (page_num, heading_title) zurück — nur Top-Level (Tiefe ≤ 1).
    """
    headings = []

    for page_num, page in enumerate(pdf.pages, 1):
        chars = page.chars or []
        page_h = float(page.height)
        if page_h == 0: continue

        # Zeilen nach Y gruppieren (2px-Raster)
        lines_by_y = {}
        for ch in chars:
            if not ch.get('text', '').strip(): continue
            y = round(float(ch.get('top', 0)) / 2) * 2
            if y not in lines_by_y: lines_by_y[y] = []
            lines_by_y[y].append(ch)

        # Kodierte Zeilen extrahieren
        coded_lines = []  # [(y_pct, decoded, orig_text)]
        seen_texts = set()
        for y in sorted(lines_by_y):
            chs = sorted(lines_by_y[y], key=lambda c: float(c.get('x0', 0)))
            text = ''.join(c.get('text', '') for c in chs).strip()
            if not text or text in seen_texts: continue
            seen_texts.add(text)

            y_pct = y / page_h * 100
            # Footer/Header filtern
            if y_pct > 88 or y_pct < 5: continue
            sizes = [float(c.get('size', 0)) for c in chs if c.get('size')]
            avg_size = sum(sizes) / len(sizes) if sizes else 10.0
            if avg_size < 9.0: continue

            decoded, enc = detect_and_decode(text)
            if enc:
                coded_lines.append((y_pct, decoded, text))

        # Aufeinanderfolgende (Nummer) + (Titel) kombinieren
        # Muster: erste Zeile ist nur Zahl ("1.1", "2"), zweite ist Titel
        i = 0
        while i < len(coded_lines):
            y_pct, decoded, orig = coded_lines[i]
            stripped = re.sub(r'\s+\d+\s*$', '', decoded).strip()

            # Ist diese Zeile eine reine Zahl/Nummerierung?
            if re.match(r'^\d+(?:\.\d+)*$', stripped):
                number = stripped
                # Nächste kodierte Zeile suchen (innerhalb 10% Y-Abstand)
                if i + 1 < len(coded_lines):
                    next_y, next_decoded, next_orig = coded_lines[i + 1]
                    if next_y - y_pct < 12:  # innerhalb 12% Seitenabstand
                        title_part = re.sub(r'\s+\d+\s*$', '', next_decoded).strip()
                        combined_decoded = f"{number}{title_part}"
                        # Titel mit Leerzeichen aus TOC suchen
                        key = norm(combined_decoded)
                        if key in toc_map:
                            _, proper_title, _ = toc_map[key]
                        else:
                            # Fallback: TOC nach Nummer suchen
                            proper_title = None
                            for toc_key, (toc_num, toc_title, _) in toc_map.items():
                                if toc_num == number:
                                    proper_title = toc_title
                                    break
                            if not proper_title:
                                proper_title = f"{number} {title_part}"

                        # Tiefe bestimmen (nur Top-Level = Tiefe ≤ 1)
                        depth = number.count('.')
                        headings.append((page_num, proper_title, depth))
                        i += 2
                        continue

            # Kein Nummer-Prefix: prüfe ob bekannte Überschrift
            key = norm(stripped)
            if key in toc_map:
                _, proper_title, _ = toc_map[key]
                depth = toc_map[key][0].count('.') if toc_map[key][0] else 0
                headings.append((page_num, proper_title, depth))
            elif re.match(r'^(Einleitung|Zusammenfassung|Lernziele)', stripped, re.IGNORECASE):
                headings.append((page_num, stripped, 0))

            i += 1

    return headings


# ── Text-Extraktion (clean, ohne Footer) ─────────────────────────────────────────

def extract_clean_text(pdf):
    """
    Gibt [(page_num, text_line)] zurück.
    Nutzt extract_text() für korrekte Leerzeichen + Char-Level für Footer-Filter.
    """
    result = []

    for page_num, page in enumerate(pdf.pages, 1):
        chars = page.chars or []
        page_h = float(page.height)

        # Footer/Header Y-Grenzen per Char bestimmen
        body_chars = set()
        for ch in chars:
            if not ch.get('text', '').strip(): continue
            y_pct = float(ch.get('top', 0)) / page_h * 100 if page_h else 50
            size = float(ch.get('size', 0))
            if 5 <= y_pct <= 88 and size >= 9.0:
                body_chars.add(id(ch))

        # extract_text() für korrekte Leerzeichen, aber nur Body-Bereich
        # Nutze bbox-basierte Extraktion
        if page_h > 0:
            header_h = page_h * 0.05
            footer_h = page_h * 0.12
            body_bbox = (0, header_h, float(page.width), page_h - footer_h)
            try:
                body_page = page.within_bbox(body_bbox)
                text = body_page.extract_text() or ''
            except Exception:
                text = page.extract_text() or ''
        else:
            text = page.extract_text() or ''

        for line in text.split('\n'):
            line = line.strip()
            if not line: continue
            # Seitenzahlen filtern
            if re.match(r'^-?\s*\d{1,4}\s*-?$', line): continue
            # Dekodierte Überschrift nicht nochmal als Body-Text
            decoded, enc = detect_and_decode(line)
            if enc and len(decoded) < 80:
                # Kodierte Zeilen werden als Überschriften behandelt, nicht als Body
                continue
            if line in ('å', '©', '®', '™'):
                continue
            result.append((page_num, line))

    return result


# ── Kapitel zusammenbauen ────────────────────────────────────────────────────────

def build_chapters(headings, text_items, num_pages):
    """
    headings: [(page_num, title, depth)]
    text_items: [(page_num, line)]
    Splittet Text an Top-Level-Überschriften (depth ≤ 1).
    """
    # Nur Top-Level Überschriften als Kapitel-Grenzen
    chapter_starts = [(p, title) for p, title, d in headings if d <= 1]

    if not chapter_starts:
        return []

    # Deduplizieren (gleiche Seite + Titel)
    seen = set()
    deduped = []
    for p, t in chapter_starts:
        key = (p, t[:30])
        if key not in seen:
            seen.add(key)
            deduped.append((p, t))
    chapter_starts = deduped

    chapters = []
    for i, (start_p, title) in enumerate(chapter_starts):
        end_p = chapter_starts[i + 1][0] - 1 if i + 1 < len(chapter_starts) else num_pages
        end_p = max(end_p, start_p)

        # Text dieser Seiten sammeln
        body_lines = [line for p, line in text_items if start_p <= p <= end_p]
        body = '\n'.join(body_lines).strip()
        wc = len(body.split())

        chapters.append({
            'chapter_num': i + 1,
            'title': title,
            'text': body,
            'word_count': wc,
            'duration_seconds': round(max(wc, 1) / 2.5),
            'start_page': start_p,
            'end_page': end_p,
        })

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

    return [ch for ch in merged if ch['word_count'] > 30]


# ── Fallback ──────────────────────────────────────────────────────────────────────

def build_chunks(text_items, num_pages, chunk_size=1500):
    all_words, word_pages = [], []
    for p, text in text_items:
        ws = text.split()
        all_words.extend(ws)
        word_pages.extend([p] * len(ws))

    chapters = []
    for i in range(0, len(all_words), chunk_size):
        cw = all_words[i:i + chunk_size]
        cp = word_pages[i:i + chunk_size]
        n = i // chunk_size + 1
        chapters.append({
            'chapter_num': n,
            'title': f'Teil {n}',
            'text': ' '.join(cw),
            'word_count': len(cw),
            'duration_seconds': round(len(cw) / 2.5),
            'start_page': cp[0] if cp else 1,
            'end_page': cp[-1] if cp else num_pages,
        })
    return chapters


# ── Main ──────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: extract_pdf.py <pdf_path>'}))
        sys.exit(1)

    try:
        with pdfplumber.open(sys.argv[1]) as pdf:
            num_pages = len(pdf.pages)

            # 1. TOC für korrekte Titel
            toc_map = extract_toc(pdf)

            # 2. Überschriften per Char-Scan finden
            headings = scan_headings(pdf, toc_map)

            # 3. Body-Text clean extrahieren
            text_items = extract_clean_text(pdf)

            # 4. Kapitel aufbauen
            chapters = build_chapters(headings, text_items, num_pages)

            if len(chapters) <= 1:
                chapters = build_chunks(text_items, num_pages)

            print(json.dumps({
                'success': True,
                'pages': num_pages,
                'total_chars': sum(ch['word_count'] * 5 for ch in chapters),
                'chapters_count': len(chapters),
                'toc_entries': len(toc_map),
                'headings_found': len(headings),
                'chapters': chapters,
            }, ensure_ascii=False))

    except Exception as e:
        import traceback
        print(json.dumps({'success': False, 'error': str(e), 'trace': traceback.format_exc()}))
        sys.exit(1)
