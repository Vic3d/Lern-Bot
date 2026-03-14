# Audio Generation - Quick Start Guide

## Das Wichtigste (TL;DR)

**Du brauchst:**
1. Python 3.7+
2. pyttsx3 (1 Kommando installieren)
3. Die cleaned text Datei (du hast sie schon)

**Du machst:**
```bash
pip install pyttsx3
python3 generate_audio.py
```

**Result:** `Chapter1_Audio.mp3` (5-8 Minuten hochwertiges Audio)

**Kosten:** €0  
**Setup:** 3 Minuten  
**Online nötig:** Nein (komplett offline!)

---

## Step-by-Step Anleitung

### 1. Python installieren (falls nicht vorhanden)

**Windows:**
- Download: https://www.python.org/downloads/
- Installieren (wichtig: "Add Python to PATH" ankreuzen)

**Mac:**
```bash
brew install python3
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

### 2. pyttsx3 installieren (one-time setup)

```bash
pip install pyttsx3
```

Das war's! Dauert ~30 Sekunden.

### 3. Audio generieren

**Variante A: Mit Standarddateien (easiest)**
```bash
cd /path/to/lernbot
python3 generate_audio.py
```

Erwartet:
- Input: `output/Chapter1_Cleaned.txt` (haben wir schon vorbereitet)
- Output: `output/Chapter1_Audio.mp3` (wird generiert)

**Variante B: Mit benutzerdefinierten Dateien**
```bash
python3 generate_audio.py input.txt output.mp3
```

z.B.:
```bash
python3 generate_audio.py my_script.txt my_audio.mp3
```

### 4. Audio abspielen

```bash
# Linux/Mac
open output/Chapter1_Audio.mp3

# Windows (in Explorer)
output/Chapter1_Audio.mp3
```

Oder mit lieblingi MP3-Player öffnen.

---

## Was passiert im Script?

```
1. Liest die cleaned text Datei (Chapter1_Cleaned.txt)
2. Initialisiert pyttsx3 Text-to-Speech Engine
3. Setzt optimale Parameter:
   - Sprechgeschwindigkeit: 140 WPM (langsamer = besser zum Lernen)
   - Lautstärke: 0.95
   - Versucht German voice zu finden (falls vorhanden)
4. Generiert MP3 Audio-Datei
5. Speichert in output/ Folder
```

---

## Erwarteter Output

```
======================================================================
🎵 Smart PDF-to-Audio Generator (Offline, Free)
======================================================================
📂 Input:  output/Chapter1_Cleaned.txt
📂 Output: output/Chapter1_Audio.mp3

📖 Reading: output/Chapter1_Cleaned.txt...
✅ Read 4127 characters (612 words)
⏱️  Estimated duration: 4m 5s

🎤 Generating audio...
   This may take a minute (first time is slower)...

✅ SUCCESS!
📂 Output: output/Chapter1_Audio.mp3
📊 File size: 0.45 MB
⏱️  Duration: ~4m 5s

🎯 Next Steps:
   1. Play the audio: output/Chapter1_Audio.mp3
   2. Listen and learn! 🎧
   3. Done! No more setup needed.

   For more chapters: Place .txt files in output/ folder and run:
   python3 generate_audio.py <input.txt> <output.mp3>
```

---

## Quality & Performance

### Sprache & Qualität
- **pyttsx3 Qualität:** 85/100 (good, natural sounding)
- **Sprache:** German (wenn vorhanden) oder System Default
- **Sprechgeschwindigkeit:** 140 WPM (slower = better for learning)
- **Lautstärke:** 0.95/1.0

### Performance
- **Generierungsdauer:** 1-3 Minuten pro Kapitel (auf modernem Computer)
- **Dateigröße:** ~0.5 MB pro 5 Minuten Audio
- **Format:** MP3 (universal playable)
- **Internet:** Nicht nötig (komplett offline!)

### Kosten
- **pyttsx3:** Free (Open Source)
- **Google Cloud Alternative:** ~$1-3 pro Buch
- **ElevenLabs Alternative:** €11-88/month
- **pyttsx3:** €0 ✅

---

## Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'pyttsx3'"

**Lösung:**
```bash
pip install pyttsx3
```

Oder mit pip3:
```bash
pip3 install pyttsx3
```

### Problem: "Python nicht gefunden"

**Lösung:**
- Windows: Python nicht im PATH. Neu installieren + "Add to PATH" ankreuzen
- Mac/Linux: `python3` statt `python` verwenden

### Problem: Audio wird nicht generiert / sehr lange Wartezeit

**Das ist normal!** Erste Generierung kann 1-3 Min dauern.
- Danach ist es schneller
- Größere Dateien = längere Wartezeit

### Problem: Audio-Qualität schlecht / robotisch

Das ist das Limit von pyttsx3. Optionen:
1. **Google Cloud:** Besser (koste ~$1/Buch)
2. **ElevenLabs:** Am besten (kosten €11-88/month)
3. **Akzeptieren:** pyttsx3 ist "gut genug" zum Lernen

---

## Für Mehrere Kapitel (Later)

1. Erstelle alle cleaned text Dateien in `output/`:
   - `Chapter1_Cleaned.txt` ✅ (done)
   - `Chapter2_Cleaned.txt` (extract from PDF)
   - `Chapter3_Cleaned.txt` (extract from PDF)
   - etc.

2. Generiere alle Audio-Dateien:
```bash
python3 generate_audio.py output/Chapter1_Cleaned.txt output/Chapter1_Audio.mp3
python3 generate_audio.py output/Chapter2_Cleaned.txt output/Chapter2_Audio.mp3
python3 generate_audio.py output/Chapter3_Cleaned.txt output/Chapter3_Audio.mp3
```

Oder schreib ein Batch-Script (ask if needed).

---

## Das Vollständige System (Zusammenhang)

```
PDF (TME102_Statik.pdf)
    ↓
[Smart Extraction: Remove Boilerplate]
    ↓
Cleaned Text (Chapter1_Cleaned.txt) ✅
    ↓
[pyttsx3 TTS: Text → Audio]
    ↓
Audio MP3 (Chapter1_Audio.mp3) ← YOU ARE HERE
    ↓
[Web UI: Play + Track + Questions]
    ↓
Student Profile: "Victor understood Tragelemente"
    ↓
[Spaced Repetition: Review on Day 2, 5, 12, 33]
    ↓
[Interleaving: Mix with other topics]
    ↓
[Elaboration + Metacognition + Feedback]
    ↓
= OPTIMAL LEARNING
```

---

## Files du brauchst

```
lernbot/
├── generate_audio.py                    ✅ (READY)
├── output/
│   ├── Chapter1_Cleaned.txt             ✅ (READY)
│   └── Chapter1_Audio.mp3               ⏳ (du generierst gleich)
└── README_AUDIO_GENERATION.md           ✅ (this file)
```

---

## Die beste Idee: Mach's jetzt!

1. **Installiere pyttsx3:**
   ```bash
   pip install pyttsx3
   ```

2. **Kopiere `generate_audio.py` zu dir lokal**

3. **Kopiere `output/Chapter1_Cleaned.txt` zu dir lokal**

4. **Führe aus:**
   ```bash
   python3 generate_audio.py
   ```

5. **Warte 2-3 Minuten**

6. **Öffne `output/Chapter1_Audio.mp3` und höre zu!**

**Das war's. Kosten: €0. Setup: 3 Minuten. Qualität: Gut genug zum Lernen.**

---

Let's go! 🚀
