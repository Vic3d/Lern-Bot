#!/usr/bin/env node

/**
 * Smart PDF-to-Audio Generator
 * Converts cleaned text to high-quality audio using Google Cloud TTS
 * 
 * Requirements:
 *   npm install google-cloud-text-to-speech
 *   Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 
 * Usage:
 *   node pdf_to_audio.js <input.txt> <output.mp3> [language_code] [voice_name]
 * 
 * Examples:
 *   node pdf_to_audio.js Chapter1_Cleaned.txt chapter1.mp3 de-DE de-DE-Neural2-B
 *   node pdf_to_audio.js Chapter1_Cleaned.txt chapter1.mp3 (defaults to German)
 */

const fs = require('fs');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');

const client = new textToSpeech.TextToSpeechClient();

async function generateSpeech(inputFile, outputFile, languageCode = 'de-DE', voiceName = 'de-DE-Neural2-B') {
  try {
    console.log('📖 Reading cleaned text file...');
    const text = fs.readFileSync(inputFile, 'utf8');
    console.log(`✅ Read ${text.length} characters\n`);

    // Break into chunks if too long (API limit: ~5000 chars per request)
    const maxChunkSize = 4000;
    const chunks = [];
    let currentChunk = '';

    text.split('\n\n').forEach(paragraph => {
      if ((currentChunk + paragraph).length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    });
    if (currentChunk) chunks.push(currentChunk);

    console.log(`📝 Split into ${chunks.length} chunks\n`);

    // Request speech synthesis for each chunk
    const audioContent = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎤 Generating audio chunk ${i + 1}/${chunks.length}...`);
      
      const request = {
        input: { text: chunks[i] },
        voice: {
          languageCode: languageCode,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          sampleRateHertz: 24000,
          pitch: 0.0,
          speakingRate: 0.95, // Slightly slower for learning
        },
      };

      try {
        const [response] = await client.synthesizeSpeech(request);
        audioContent.push(response.audioContent);
        console.log(`  ✅ Chunk ${i + 1} generated (${response.audioContent.length} bytes)`);
      } catch (err) {
        console.error(`  ❌ Error generating chunk ${i + 1}: ${err.message}`);
        throw err;
      }
    }

    // Combine audio chunks
    console.log('\n📦 Combining audio chunks...');
    const totalAudio = Buffer.concat(audioContent);
    
    // Write to file
    fs.writeFileSync(outputFile, totalAudio, 'binary');
    console.log(`✅ Audio saved to: ${outputFile}`);
    console.log(`📊 Total audio size: ${totalAudio.length} bytes (${(totalAudio.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Estimate duration (rough: MP3 ~128kbps = 1000 bytes/sec)
    const estimatedSeconds = totalAudio.length / 1000;
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = Math.floor(estimatedSeconds % 60);
    console.log(`⏱️  Estimated duration: ${minutes}m ${seconds}s`);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node pdf_to_audio.js <input.txt> <output.mp3> [language_code] [voice_name]');
  console.log('');
  console.log('Examples:');
  console.log('  node pdf_to_audio.js Chapter1_Cleaned.txt chapter1.mp3');
  console.log('  node pdf_to_audio.js Chapter1_Cleaned.txt chapter1.mp3 de-DE de-DE-Neural2-C');
  console.log('  node pdf_to_audio.js Chapter1_Cleaned.txt chapter1.mp3 en-US en-US-Neural2-A');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];
const languageCode = args[2] || 'de-DE';
const voiceName = args[3] || 'de-DE-Neural2-B';

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log('🚀 Smart PDF-to-Audio Generator\n');
console.log(`📂 Input:  ${inputFile}`);
console.log(`📂 Output: ${outputFile}`);
console.log(`🗣️  Language: ${languageCode}`);
console.log(`🎙️  Voice: ${voiceName}\n`);

generateSpeech(inputFile, outputFile, languageCode, voiceName);
