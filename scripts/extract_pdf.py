#!/usr/bin/env python3
"""
PDF Text Extraction via pdfplumber
Usage: python3 scripts/extract_pdf.py <pdf_path>
Output: JSON mit chapters + start_page/end_page pro Kapitel
"""
import sys
import json
import re
import pdfplumber


def clean_line(line: str) -> str:
    return line.strip()


def is_noise(line: str) -> bool:
    l = line.strip()
    if not l:
        return True
    if re.match(r'^-?\s*\d+\s*-?$', l):
        return True
    if re.match(r'^(Seite|Page)\s+\d+', l, re.IGNORECASE):
        return True
    if len(l) < 2:
        return True
    return False


def clean_chapter_title(title: str) -> str:
    return re.sub(r'\s+\d+\s*$', '', title.strip())


heading_pattern = re.compile(
    r'^('
    r'\d+\.\d+(?:\.\d+)*\s+[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß /\-]{2,70}'
    r'|\d+\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß /\-]{3,70}'
    r'|Einleitung(?:\s*/\s*Lernziele)?'
    r'|Einleitung\s*und\s*Lernziele'
    r'|Zusammenfassung'
    r'|Lernziele'
    r')$'
)


def extract_text(pdf_path: str):
    """
    Gibt (page_lines, num_pages) zurück.
    page_lines = [(page_num, line_text), ...] — jede Zeile mit ihrer Seitennummer
    """
    page_lines = []
    num_pages = 0
    with pdfplumber.open(pdf_path) as pdf:
        num_pages = len(pdf.pages)
        for page_num, page in enumerate(pdf.pages, 1):
            t = page.extract_text()
            if t:
                for line in t.split('\n'):
                    page_lines.append((page_num, line))
    return page_lines, num_pages


def split_chapters(page_lines, filename, num_pages):
    """
    Spaltet Text in Kapitel auf.
    Speichert start_page und end_page pro Kapitel.
    """
    chapters = []
    current_title = "Einleitung"
    current_items = []   # [(page_num, cleaned_line)]
    chapter_num = 0

    for page_num, raw_line in page_lines:
        if is_noise(raw_line):
            continue
        line = clean_line(raw_line)
        if not line:
            continue

        if heading_pattern.match(line) and len(" ".join(l for _, l in current_items)) > 300:
            if current_items:
                chapter_num += 1
                pages = [p for p, _ in current_items]
                body = "\n".join(l for _, l in current_items).strip()
                word_count = len(body.split())
                chapters.append({
                    "chapter_num": chapter_num,
                    "title": clean_chapter_title(current_title),
                    "text": body,
                    "word_count": word_count,
                    "duration_seconds": round(word_count / 2.5),
                    "start_page": min(pages),
                    "end_page": max(pages),
                })
            current_title = line
            current_items = []
        else:
            current_items.append((page_num, line))

    # Letztes Kapitel
    if current_items:
        chapter_num += 1
        pages = [p for p, _ in current_items]
        body = "\n".join(l for _, l in current_items).strip()
        word_count = len(body.split())
        chapters.append({
            "chapter_num": chapter_num,
            "title": clean_chapter_title(current_title),
            "text": body,
            "word_count": word_count,
            "duration_seconds": round(word_count / 2.5),
            "start_page": min(pages) if pages else 1,
            "end_page": max(pages) if pages else num_pages,
        })

    # Fallback: kein Kapitel erkannt → nach Wortanzahl splitten
    if len(chapters) <= 1 and sum(len(l.split()) for _, l in page_lines) > 1000:
        all_items = [(p, l) for p, l in page_lines if not is_noise(l) and clean_line(l)]
        all_words = []
        word_pages = []
        for p, l in all_items:
            ws = l.split()
            all_words.extend(ws)
            word_pages.extend([p] * len(ws))

        chunk_size = 1500
        chapters = []
        for i in range(0, len(all_words), chunk_size):
            chunk_words = all_words[i:i + chunk_size]
            chunk_pages = word_pages[i:i + chunk_size]
            num = i // chunk_size + 1
            chapters.append({
                "chapter_num": num,
                "title": f"Teil {num}",
                "text": " ".join(chunk_words),
                "word_count": len(chunk_words),
                "duration_seconds": round(len(chunk_words) / 2.5),
                "start_page": chunk_pages[0] if chunk_pages else 1,
                "end_page": chunk_pages[-1] if chunk_pages else num_pages,
            })

    return chapters


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: extract_pdf.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    filename = pdf_path.split("/")[-1]

    try:
        page_lines, num_pages = extract_text(pdf_path)
        full_text = "\n".join(l for _, l in page_lines if not is_noise(l))
        chapters = split_chapters(page_lines, filename, num_pages)

        result = {
            "success": True,
            "pages": num_pages,
            "total_chars": len(full_text),
            "chapters_count": len(chapters),
            "chapters": chapters
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
