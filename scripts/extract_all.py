#!/usr/bin/env python3
"""Extract all 3 TME scripts into structured chapters for the Tutor."""
import sys, json, re, os
sys.path.insert(0, os.path.dirname(__file__))
from extract_pdf import process_pdf, build_chapters

SCRIPTS_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(os.path.dirname(SCRIPTS_DIR), 'data')

PDFS = [
    ("TME101", os.path.join(SCRIPTS_DIR, "TME101_11286_K1113_OC.pdf")),
    ("TME102", os.path.join(SCRIPTS_DIR, "TME102_11287_K1113_OC.pdf")),
    ("TME103", os.path.join(SCRIPTS_DIR, "TME103_11288_K1113_OC.pdf")),
]

def extract_kapitel_nr(title: str) -> str:
    """Extract chapter number like '1.1' or '2.3.1' from title."""
    m = re.match(r'^(\d+(?:\.\d+)*)\s+', title)
    return m.group(1) if m else ""

def make_id(skript: str, num: int) -> str:
    return f"{skript.lower()}-ch{num:02d}"

all_chapters = []

for skript_name, pdf_path in PDFS:
    print(f"Processing {skript_name}...", file=sys.stderr)
    all_items, num_pages = process_pdf(pdf_path)
    chapters = build_chapters(all_items, num_pages)
    print(f"  → {len(chapters)} chapters found", file=sys.stderr)
    
    for ch in chapters:
        kapitel_nr = extract_kapitel_nr(ch['title'])
        all_chapters.append({
            "id": make_id(skript_name, ch['chapter_num']),
            "skript": skript_name,
            "kapitel_nr": kapitel_nr,
            "titel": ch['title'],
            "text": ch['text'],
            "seite_von": ch['start_page'],
            "seite_bis": ch['end_page'],
            "word_count": ch['word_count'],
        })

os.makedirs(DATA_DIR, exist_ok=True)
out_path = os.path.join(DATA_DIR, 'all_chapters.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(all_chapters, f, ensure_ascii=False, indent=2)

print(f"\nDone! {len(all_chapters)} chapters written to {out_path}", file=sys.stderr)
print(json.dumps({"total": len(all_chapters), "by_skript": {
    s: len([c for c in all_chapters if c['skript'] == s]) for s in ['TME101', 'TME102', 'TME103']
}}))
