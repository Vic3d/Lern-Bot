#!/usr/bin/env python3
"""Generate audio from text using pyttsx3"""

import sys
import json
import pyttsx3
import os

def generate_audio(text: str, output_path: str, language: str = 'de') -> dict:
    """Generate audio from text"""
    
    try:
        # Create directory if needed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Initialize TTS engine
        engine = pyttsx3.init()
        
        # Set language and properties
        engine.setProperty('rate', 140)  # Words per minute
        engine.setProperty('volume', 1.0)
        
        # Try to set voice language (German)
        voices = engine.getProperty('voices')
        for voice in voices:
            if 'German' in voice.name or 'de' in voice.id.lower():
                engine.setProperty('voice', voice.id)
                break
        
        # Save to file
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        
        # Check if file was created
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return {
                'success': True,
                'audio_path': output_path,
                'file_size': os.path.getsize(output_path)
            }
        else:
            return {
                'success': False,
                'error': 'Audio file was not created'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'error': 'Missing arguments'}))
        sys.exit(1)
    
    text = sys.argv[1]
    output_path = sys.argv[2]
    
    result = generate_audio(text, output_path)
    print(json.dumps(result))
