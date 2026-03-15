#!/usr/bin/env python3
"""
PDF Text Extraction via pdfplumber
Usage: python3 scripts/extract_pdf.py <pdf_path>
Output: JSON mit chapters
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
    if re.match(r'^-?\s*\d+\s*-?$', l):  # Seitenzahlen
        return True
    if re.match(r'^(Seite|Page)\s+\d+', l, re.IGNORECASE):
        return True
    if len(l) < 2:
        return True
    return False


def extract_text(pdf_path: str):
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        num_pages = len(pdf.pages)
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)

    full_text = "\n".join(pages_text)
    lines = full_text.split("\n")
    cleaned = [clean_line(l) for l in lines if not is_noise(l)]
    return "\n".join(cleaned), num_pages


def clean_chapter_title(title: str) -> str:
    """Remove trailing page numbers like '1.4 Statische Bestimmtheit 18' → '1.4 Statische Bestimmtheit'"""
    return re.sub(r'\s+\d+\s*$', '', title.strip())


def split_chapters(text: str, filename: str):
    # Überschriften erkennen: "1.1 Tragelemente", "2.3.1 Knotenpunktverfahren", etc.
    # Muss im Format "x.y Titel" oder "x.y.z Titel" sein (Punkt-Notation nötig)
    # Erlaubt nur Buchstaben, Leerzeichen, Umlaute, Bindestrich und /
    heading_pattern = re.compile(
        r'^(\d+\.\d+(?:\.\d+)*\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß /\-]{3,70}'
        r'|Einleitung(?:\s*/\s*Lernziele)?'
        r'|Einleitung\s*und\s*Lernziele'
        r'|Zusammenfassung'
        r')$'
    )

    lines = text.split("\n")
    chapters = []
    current_title = "Einleitung"
    current_lines = []
    chapter_num = 0

    for line in lines:
        if heading_pattern.match(line) and len(" ".join(current_lines)) > 300:
            if current_lines:
                chapter_num += 1
                body = "\n".join(current_lines).strip()
                word_count = len(body.split())
                chapters.append({
                    "chapter_num": chapter_num,
                    "title": clean_chapter_title(current_title),
                    "text": body,
                    "word_count": word_count,
                    "duration_seconds": round(word_count / 2.5)
                })
            current_title = line.strip()
            current_lines = []
        else:
            current_lines.append(line)

    # Letztes Kapitel
    if current_lines:
        chapter_num += 1
        body = "\n".join(current_lines).strip()
        word_count = len(body.split())
        chapters.append({
            "chapter_num": chapter_num,
            "title": clean_chapter_title(current_title),
            "text": body,
            "word_count": word_count,
            "duration_seconds": round(word_count / 2.5)
        })

    # Fallback: wenn kein Kapitel erkannt → nach Wortanzahl splitten
    if len(chapters) <= 1 and len(text.split()) > 1000:
        words = text.split()
        chunk_size = 1500
        chapters = []
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            num = i // chunk_size + 1
            chapters.append({
                "chapter_num": num,
                "title": f"{filename} — Teil {num}",
                "text": chunk,
                "word_count": len(words[i:i + chunk_size]),
                "duration_seconds": round(len(words[i:i + chunk_size]) / 2.5)
            })

    return chapters


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: extract_pdf.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    filename = pdf_path.split("/")[-1]

    try:
        text, num_pages = extract_text(pdf_path)
        chapters = split_chapters(text, filename)

        result = {
            "success": True,
            "pages": num_pages,
            "total_chars": len(text),
            "chapters_count": len(chapters),
            "chapters": chapters
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
