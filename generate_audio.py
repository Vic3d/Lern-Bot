#!/usr/bin/env python3
"""
Smart PDF-to-Audio Generator (Offline, Free)
Converts cleaned text to MP3 audio using pyttsx3
No API keys, no internet required, completely offline!

Usage:
    python3 generate_audio.py
    
Or with custom input/output:
    python3 generate_audio.py input.txt output.mp3
"""

import sys
import os
from pathlib import Path

# Try to import pyttsx3, install if needed
try:
    import pyttsx3
except ImportError:
    print("📦 Installing pyttsx3 (one-time setup)...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyttsx3", "-q"])
    import pyttsx3
    print("✅ pyttsx3 installed!\n")


class AudioGenerator:
    def __init__(self, speed=150, volume=0.9):
        """Initialize TTS engine"""
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', speed)        # Words per minute
        self.engine.setProperty('volume', volume)     # 0.0 to 1.0
        
        # Try to set German voice if available
        try:
            voices = self.engine.getProperty('voices')
            # Look for German voice
            for voice in voices:
                if 'german' in voice.name.lower() or 'de' in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    print(f"✅ Using German voice: {voice.name}")
                    return
            
            # If no German voice, use default
            print("⚠️  German voice not available, using system default")
            if voices:
                self.engine.setProperty('voice', voices[0].id)
        except Exception as e:
            print(f"⚠️  Could not set voice: {e}")
    
    def generate(self, input_file: str, output_file: str):
        """Generate audio from text file"""
        
        # Check input file exists
        if not os.path.exists(input_file):
            print(f"❌ Input file not found: {input_file}")
            return False
        
        try:
            # Read text
            print(f"📖 Reading: {input_file}...")
            with open(input_file, 'r', encoding='utf-8') as f:
                text = f.read()
            
            char_count = len(text)
            word_count = len(text.split())
            estimated_duration = word_count / 150 * 60  # At 150 WPM
            
            print(f"✅ Read {char_count} characters ({word_count} words)")
            print(f"⏱️  Estimated duration: {int(estimated_duration // 60)}m {int(estimated_duration % 60)}s\n")
            
            # Clean output directory
            Path(output_file).parent.mkdir(parents=True, exist_ok=True)
            
            # Generate audio
            print(f"🎤 Generating audio...")
            print(f"   This may take a minute (first time is slower)...")
            
            self.engine.save_to_file(text, output_file)
            self.engine.runAndWait()
            
            # Check if file was created
            if os.path.exists(output_file):
                file_size = os.path.getsize(output_file)
                print(f"\n✅ SUCCESS!")
                print(f"📂 Output: {output_file}")
                print(f"📊 File size: {file_size / 1024 / 1024:.2f} MB")
                print(f"⏱️  Duration: ~{int(estimated_duration // 60)}m {int(estimated_duration % 60)}s\n")
                return True
            else:
                print(f"❌ Failed to generate audio file")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False


def main():
    # Get input/output files
    if len(sys.argv) >= 3:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
    else:
        # Use defaults
        input_file = "/data/.openclaw/workspace/lernbot/output/Chapter1_Cleaned.txt"
        output_file = "/data/.openclaw/workspace/lernbot/output/Chapter1_Audio.mp3"
    
    print("=" * 70)
    print("🎵 Smart PDF-to-Audio Generator (Offline, Free)")
    print("=" * 70)
    print(f"📂 Input:  {input_file}")
    print(f"📂 Output: {output_file}\n")
    
    # Generate
    generator = AudioGenerator(speed=140, volume=0.95)  # Slightly slower for learning
    success = generator.generate(input_file, output_file)
    
    if success:
        print("🎯 Next Steps:")
        print(f"   1. Play the audio: {output_file}")
        print(f"   2. Listen and learn! 🎧")
        print(f"   3. Done! No more setup needed.\n")
        print("   For more chapters: Place .txt files in output/ folder and run:")
        print(f"   python3 generate_audio.py <input.txt> <output.mp3>\n")
    else:
        print("❌ Audio generation failed. Check the error above.\n")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
