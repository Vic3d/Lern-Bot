#!/usr/bin/env python3
"""Extract text from PDF using pdfplumber"""

import sys
import json
import pdfplumber
from pathlib import Path

def extract_pdf(pdf_path: str) -> dict:
    """Extract text from PDF and return chapters"""
    
    chapters = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages", file=sys.stderr)
            
            # For MVP: treat each page as a section, then group into chapters
            page_texts = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    # Clean boilerplate
                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                    # Remove page numbers, headers, footers
                    filtered = [l for l in lines if len(l) > 3 and not l.isdigit()]
                    page_texts.append('\n'.join(filtered))
            
            # Group pages into chapters (for MVP: every 5 pages = 1 chapter)
            chapter_size = 5
            for i in range(0, len(page_texts), chapter_size):
                chapter_num = i // chapter_size + 1
                chapter_text = '\n\n'.join(page_texts[i:i+chapter_size])
                
                if chapter_text.strip():
                    chapters.append({
                        'chapter_num': chapter_num,
                        'title': f'Chapter {chapter_num}',
                        'cleaned_text': chapter_text.strip(),
                        'word_count': len(chapter_text.split())
                    })
        
        return {
            'success': True,
            'chapters': chapters,
            'total_chapters': len(chapters)
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No PDF path provided'}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_pdf(pdf_path)
    print(json.dumps(result))
