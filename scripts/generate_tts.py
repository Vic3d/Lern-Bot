#!/usr/bin/env python3
"""
Generate audio from text using gTTS (Google Text-to-Speech).

Usage:
    echo '{"chapter_id": "abc123", "text": "Hallo Welt", "output_dir": "/tmp/audio"}' | python3 generate_tts.py

Output JSON:
    {"success": true, "audio_path": "/audio/abc123.mp3", "duration_seconds": 42}
"""
import sys
import json
import os

def estimate_duration(text: str) -> int:
    """Estimate speaking duration: ~2.5 words/second for German."""
    words = len(text.split())
    return max(1, round(words / 2.5))

def generate_audio(chapter_id: str, text: str, output_dir: str) -> dict:
    try:
        from gtts import gTTS
    except ImportError:
        return {"success": False, "error": "gTTS not installed. Run: pip3 install gtts --break-system-packages"}

    try:
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{chapter_id}.mp3")

        # Clean text: remove excessive whitespace, truncate if very long (gTTS limit ~5000 chars per call)
        clean = " ".join(text.split())

        # Split into chunks if too long (gTTS can handle ~5000 chars reliably)
        chunk_size = 4500
        if len(clean) <= chunk_size:
            tts = gTTS(text=clean, lang='de', slow=False)
            tts.save(output_path)
        else:
            # Split at sentence boundaries, save in parts, then concatenate
            import tempfile
            import shutil

            chunks = []
            current = ""
            for sentence in clean.replace(". ", ".|").replace("! ", "!|").replace("? ", "?|").split("|"):
                if len(current) + len(sentence) < chunk_size:
                    current += sentence + " "
                else:
                    if current:
                        chunks.append(current.strip())
                    current = sentence + " "
            if current:
                chunks.append(current.strip())

            # Generate each chunk
            tmp_files = []
            for i, chunk in enumerate(chunks):
                tmp_path = os.path.join(output_dir, f"{chapter_id}_part{i}.mp3")
                tts = gTTS(text=chunk, lang='de', slow=False)
                tts.save(tmp_path)
                tmp_files.append(tmp_path)

            # Concatenate MP3 files (binary concat works for MP3)
            with open(output_path, 'wb') as outf:
                for tmp_path in tmp_files:
                    with open(tmp_path, 'rb') as inf:
                        outf.write(inf.read())
            
            # Cleanup temp parts
            for tmp_path in tmp_files:
                try:
                    os.remove(tmp_path)
                except:
                    pass

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return {"success": False, "error": "Audio file empty or not created"}

        duration = estimate_duration(text)
        return {
            "success": True,
            "audio_path": f"/audio/{chapter_id}.mp3",
            "duration_seconds": duration,
            "file_size": os.path.getsize(output_path)
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"success": False, "error": "No input provided via stdin"}))
        sys.exit(1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    chapter_id = data.get("chapter_id", "")
    text = data.get("text", "")
    output_dir = data.get("output_dir", "/tmp/audio")

    if not chapter_id or not text:
        print(json.dumps({"success": False, "error": "Missing chapter_id or text"}))
        sys.exit(1)

    result = generate_audio(chapter_id, text, output_dir)
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("success") else 1)
