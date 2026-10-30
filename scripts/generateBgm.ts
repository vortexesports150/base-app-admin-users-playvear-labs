import { pcmToWav } from '../server/audioHelper.ts';
import fs from 'fs';
import path from 'path';

// Sample rate 24000Hz, mono, 16-bit
const SAMPLE_RATE = 24000;

function createNatureFluteAndBirdsBuffer(durationSeconds = 12): Buffer {
  const totalSamples = SAMPLE_RATE * durationSeconds;
  const buffer = Buffer.alloc(totalSamples * 2);

  // Bengali Flute (Bansuri) melody notes (frequencies in Hz):
  // Raga Bhupali / Desh folk scale notes: D4 (293.66), E4 (329.63), G4 (392.00), A4 (440.00), B4 (493.88), D5 (587.33)
  const notes = [
    { freq: 392.00, dur: 2.2 }, // G4
    { freq: 440.00, dur: 1.8 }, // A4
    { freq: 493.88, dur: 2.5 }, // B4
    { freq: 440.00, dur: 1.5 }, // A4
    { freq: 392.00, dur: 2.0 }, // G4
    { freq: 329.63, dur: 2.0 }, // E4
  ];

  let sampleIdx = 0;
  for (const note of notes) {
    const noteSamples = Math.floor(note.dur * SAMPLE_RATE);
    for (let i = 0; i < noteSamples && sampleIdx < totalSamples; i++, sampleIdx++) {
      const t = sampleIdx / SAMPLE_RATE;
      const noteT = i / noteSamples;

      // Gentle flute envelope (soft breath attack and smooth release)
      let env = 1.0;
      if (noteT < 0.2) env = noteT / 0.2;
      else if (noteT > 0.8) env = (1.0 - noteT) / 0.2;

      // Vibrato (5.5 Hz pitch modulation characteristic of bamboo flute)
      const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 3.5;
      const currentFreq = note.freq + vibrato;

      // Flute timbre: fundamental sine + warm 2nd & 3rd harmonics + subtle breath air
      const fundamental = Math.sin(2 * Math.PI * currentFreq * t);
      const secondHarmonic = 0.25 * Math.sin(2 * Math.PI * (currentFreq * 2) * t);
      const thirdHarmonic = 0.08 * Math.sin(2 * Math.PI * (currentFreq * 3) * t);
      const breathNoise = (Math.random() * 2 - 1) * 0.035;

      const fluteSignal = (fundamental + secondHarmonic + thirdHarmonic + breathNoise) * env * 0.28;

      // Chirping country birds (sweet chirps occurring periodically)
      let birdSignal = 0;
      const chirpCycle = t % 3.0; // chirp burst every 3 seconds
      if (chirpCycle > 0.4 && chirpCycle < 0.65) {
        const ct = chirpCycle - 0.4;
        const chirpFreq = 2600 + Math.sin(ct * 60) * 800; // warbling high frequency
        birdSignal = Math.sin(2 * Math.PI * chirpFreq * t) * Math.sin(Math.PI * (ct / 0.25)) * 0.08;
      }

      // Gentle rustling wind ambient
      const windAmbient = Math.sin(2 * Math.PI * 85 * t) * 0.02;

      const combined = (fluteSignal + birdSignal + windAmbient);
      const clamped = Math.max(-1, Math.min(1, combined));
      const pcm16 = Math.floor(clamped * 32767);
      buffer.writeInt16LE(pcm16, sampleIdx * 2);
    }
  }

  // Fill remaining if any
  while (sampleIdx < totalSamples) {
    buffer.writeInt16LE(0, sampleIdx * 2);
    sampleIdx++;
  }

  return pcmToWav(buffer, SAMPLE_RATE, 1, 16);
}

function createElectionMikingAmbienceBuffer(durationSeconds = 12): Buffer {
  const totalSamples = SAMPLE_RATE * durationSeconds;
  const buffer = Buffer.alloc(totalSamples * 2);

  let sampleIdx = 0;
  for (let i = 0; i < totalSamples; i++, sampleIdx++) {
    const t = i / SAMPLE_RATE;

    // 1. Rickshaw Bell ("Tring Tring" metallic chime every ~3.5 seconds)
    let bellSignal = 0;
    const bellCycle = t % 3.8;
    // Stroke 1
    if (bellCycle >= 0.2 && bellCycle < 0.5) {
      const bt = bellCycle - 0.2;
      const decay = Math.exp(-bt * 12);
      const bellTone = (
        Math.sin(2 * Math.PI * 1850 * t) * 0.6 +
        Math.sin(2 * Math.PI * 2350 * t) * 0.3 +
        Math.sin(2 * Math.PI * 3400 * t) * 0.15
      ) * decay * 0.35;
      bellSignal += bellTone;
    }
    // Stroke 2
    if (bellCycle >= 0.45 && bellCycle < 0.75) {
      const bt = bellCycle - 0.45;
      const decay = Math.exp(-bt * 14);
      const bellTone = (
        Math.sin(2 * Math.PI * 1920 * t) * 0.6 +
        Math.sin(2 * Math.PI * 2420 * t) * 0.3 +
        Math.sin(2 * Math.PI * 3500 * t) * 0.15
      ) * decay * 0.32;
      bellSignal += bellTone;
    }

    // 2. Distant rural bazaar hum (muffled low chatter / crowd murmur)
    const murmur1 = Math.sin(2 * Math.PI * 110 * t) * 0.025;
    const murmur2 = Math.sin(2 * Math.PI * 175 * t) * 0.02;
    const marketHum = (Math.random() * 2 - 1) * 0.015 + murmur1 + murmur2;

    // 3. Horn loudspeaker subtle 50Hz mains generator hum & air
    const generatorHum = Math.sin(2 * Math.PI * 50 * t) * 0.02 + Math.sin(2 * Math.PI * 100 * t) * 0.01;

    const combined = bellSignal + marketHum + generatorHum;
    const clamped = Math.max(-1, Math.min(1, combined));
    const pcm16 = Math.floor(clamped * 32767);
    buffer.writeInt16LE(pcm16, sampleIdx * 2);
  }

  return pcmToWav(buffer, SAMPLE_RATE, 1, 16);
}

function createMysteryDroneBuffer(durationSeconds = 12): Buffer {
  const totalSamples = SAMPLE_RATE * durationSeconds;
  const buffer = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Mayajaal style: Deep dark ominous sub-drone (55Hz A1 root note + slow pulse)
    const subDrone = Math.sin(2 * Math.PI * 55 * t) * 0.22;
    const fifthDrone = Math.sin(2 * Math.PI * 82.4 * t) * 0.12; // E2 power chord
    const eerieTension = Math.sin(2 * Math.PI * 116.54 * t + Math.sin(t * 1.5)) * 0.06; // Bb2 dissonant tension

    // Mysterious metallic tick-tock pulse (every 0.8s)
    let tick = 0;
    const tickCycle = t % 0.8;
    if (tickCycle < 0.05) {
      const decay = Math.exp(-tickCycle * 90);
      tick = (Math.sin(2 * Math.PI * 1200 * t) + (Math.random() * 2 - 1) * 0.2) * decay * 0.12;
    }

    const combined = subDrone + fifthDrone + eerieTension + tick;
    const clamped = Math.max(-1, Math.min(1, combined));
    const pcm16 = Math.floor(clamped * 32767);
    buffer.writeInt16LE(pcm16, i * 2);
  }

  return pcmToWav(buffer, SAMPLE_RATE, 1, 16);
}

const outDir = path.join(process.cwd(), 'public', 'audio');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'nature_poet_bgm.wav'), createNatureFluteAndBirdsBuffer(15));
fs.writeFileSync(path.join(outDir, 'election_miking_bgm.wav'), createElectionMikingAmbienceBuffer(15));
fs.writeFileSync(path.join(outDir, 'mystery_teller_bgm.wav'), createMysteryDroneBuffer(15));

console.log('Generated studio-quality BGM tracks in public/audio/');
