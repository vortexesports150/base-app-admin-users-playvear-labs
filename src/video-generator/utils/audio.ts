// Helper to record microphone audio directly in browser
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.startTime = Date.now();

    // Select best supported MIME type
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

    this.mediaRecorder = new MediaRecorder(this.stream, selectedMime ? { mimeType: selectedMime } : undefined);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // 100ms slice
  }

  stop(): Promise<{ blob: Blob; url: string; mimeType: string; elapsedSeconds: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not initialized'));
      }

      const elapsedSeconds = Math.max(1, (Date.now() - this.startTime) / 1000);

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Clean up tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }

        resolve({ blob, url, mimeType, elapsedSeconds });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// Accurately measure audio duration by decoding the raw audio data via AudioContext
export async function getAudioDuration(source: string | Blob | File): Promise<number> {
  try {
    let arrayBuffer: ArrayBuffer;
    if (typeof source === 'string') {
      const res = await fetch(source);
      arrayBuffer = await res.arrayBuffer();
    } else {
      arrayBuffer = await source.arrayBuffer();
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const dur = audioBuffer.duration;
        if (dur && isFinite(dur) && dur > 0) {
          return dur;
        }
      } catch (decodeErr) {
        console.warn('decodeAudioData failed:', decodeErr);
      } finally {
        audioCtx.close().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('AudioContext arrayBuffer fetch error:', err);
  }

  // Fallback to HTMLAudioElement only if duration is finite (avoids Chromium WebM Infinity bug)
  return new Promise((resolve) => {
    try {
      const url = typeof source === 'string' ? source : URL.createObjectURL(source);
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = url;
      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          resolve(dur);
        } else {
          resolve(0);
        }
      };
      audio.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

// Convert any Blob or Blob URL to Base64 Data URI
export async function blobUrlToDataUri(urlOrBlob: string | Blob): Promise<string> {
  if (typeof urlOrBlob === 'string' && urlOrBlob.startsWith('data:')) {
    return urlOrBlob;
  }

  let blob: Blob;
  if (typeof urlOrBlob === 'string') {
    const res = await fetch(urlOrBlob);
    blob = await res.blob();
  } else {
    blob = urlOrBlob;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to construct a standard 44.1kHz 16-bit Mono WAV buffer
export function createWavBlob(sampleRate: number, samples: Float32Array): { blob: Blob; url: string } {
  const totalSamples = samples.length;
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // 1 Mono channel
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * 2, true); // Byte rate (16-bit mono = 2 bytes/sample)
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

// Convert any Audio Blob / File / URI (e.g. MediaRecorder webm, opus, m4a, mp3) to clean 16-bit 44.1kHz PCM WAV
export async function convertAudioBlobToWav(
  audioSource: Blob | File | string
): Promise<{ blob: Blob; url: string; dataUri: string; duration: number }> {
  let arrayBuffer: ArrayBuffer;
  if (typeof audioSource === 'string') {
    const res = await fetch(audioSource);
    arrayBuffer = await res.arrayBuffer();
  } else {
    arrayBuffer = await audioSource.arrayBuffer();
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('AudioContext not supported');
  }

  const audioCtx = new AudioContextClass();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const sampleRate = 44100;
    const duration = audioBuffer.duration;
    const targetLength = Math.max(1, Math.round(duration * sampleRate));

    // Mix down all channels into a single mono Float32Array
    const monoSamples = new Float32Array(targetLength);
    const numChannels = audioBuffer.numberOfChannels;
    const srcLength = audioBuffer.length;
    const srcRate = audioBuffer.sampleRate;

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = (i * srcRate) / sampleRate;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(srcLength - 1, indexFloor + 1);
      const frac = srcIndex - indexFloor;

      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        const s1 = channelData[indexFloor] || 0;
        const s2 = channelData[indexCeil] || 0;
        sum += s1 + (s2 - s1) * frac;
      }
      monoSamples[i] = sum / numChannels;
    }

    const { blob, url } = createWavBlob(sampleRate, monoSamples);
    const dataUri = await blobUrlToDataUri(blob);
    return { blob, url, dataUri, duration };
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * 1. Character 1: Bangladeshi TV News Anchor (ফারহান আহমেদ)
 * Authoritative, paced, broadcast tone.
 * 12.0 seconds with three clear sentence phrases and natural breathing pauses.
 * Phrase 1: 0.2s - 3.6s ("শুভ সন্ধ্যা, বাংলাদেশ সংবাদে আপনাদের স্বাগত...")
 * Pause: 3.6s - 4.1s
 * Phrase 2: 4.1s - 7.6s ("আজ রাতের প্রধান প্রধান সংবাদ শিরোনামে থাকছে...")
 * Pause: 7.6s - 8.1s
 * Phrase 3: 8.1s - 11.5s ("বিস্তারিত খবর নিয়ে ফিরছি একটু পর, সাথে থাকুন।")
 * Ending: 11.5s - 12.0s
 */
export function generateAnchorVoiceAudio(durationSeconds = 12): { blob: Blob; url: string; duration: number } {
  const sampleRate = 44100;
  const totalSamples = Math.round(sampleRate * durationSeconds);
  const samples = new Float32Array(totalSamples);

  const baseF0 = 128; // Deep resonant male news anchor pitch

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Sentence active windows (Phrase 1, 2, 3)
    let sentenceEnvelope = 0;
    if (t >= 0.2 && t <= 3.6) {
      sentenceEnvelope = Math.sin(((t - 0.2) / 3.4) * Math.PI);
    } else if (t >= 4.1 && t <= 7.6) {
      sentenceEnvelope = Math.sin(((t - 4.1) / 3.5) * Math.PI);
    } else if (t >= 8.1 && t <= 11.5) {
      sentenceEnvelope = Math.sin(((t - 8.1) / 3.4) * Math.PI);
    }

    if (sentenceEnvelope <= 0.001) {
      // Room presence during breath/pause
      samples[i] = (Math.random() - 0.5) * 0.003;
      continue;
    }

    // Syllable rhythm: ~4.2 syllables per second (articulated Bengali broadcast cadence)
    const syllablePhase = (t * 4.2 * 2 * Math.PI) % (2 * Math.PI);
    const syllableEnvelope = Math.pow(Math.sin(syllablePhase * 0.5), 2) * 0.7 + 0.3;

    // Pitch inflection across sentences (declarative inflection: drops slightly at phrase ends)
    const phraseLocalTime = t % 4;
    const pitchOffset = Math.sin(phraseLocalTime * 1.5) * 4 - (phraseLocalTime > 2.5 ? 6 : 0);
    const f0 = baseF0 + pitchOffset;

    // Rich vocal tract formants for male voice (F0, F1 ~ 520Hz, F2 ~ 1480Hz, F3 ~ 2600Hz)
    const glottal = Math.sin(2 * Math.PI * f0 * t) * 0.45 + Math.sin(2 * Math.PI * (f0 * 2) * t) * 0.25;
    const f1 = Math.sin(2 * Math.PI * 520 * t + Math.sin(t * 3) * 0.5) * 0.35;
    const f2 = Math.sin(2 * Math.PI * 1480 * t) * 0.25;
    const f3 = Math.sin(2 * Math.PI * 2600 * t) * 0.12;

    // Consonant friction burst at syllable transitions
    const friction = (Math.random() - 0.5) * (Math.sin(syllablePhase) > 0.8 ? 0.08 : 0.01);

    const voiceSignal = (glottal + f1 + f2 + f3 + friction) * syllableEnvelope * sentenceEnvelope * 0.55;
    samples[i] = Math.max(-0.95, Math.min(0.95, voiceSignal));
  }

  const { blob, url } = createWavBlob(sampleRate, samples);
  return { blob, url, duration: durationSeconds };
}

/**
 * 2. Character 2: Bangladeshi Content Creator & Podcaster (নাফিস আহমেদ)
 * Energetic, engaging, dynamic conversational tone.
 * 12.0 seconds with lively podcast greeting, upbeat cadence, and call-to-action.
 * Phrase 1: 0.15s - 3.8s ("হ্যালো বন্ধুরা! আজকের ভিডিওতে সবাইকে স্বাগতম...")
 * Pause: 3.8s - 4.2s
 * Phrase 2: 4.2s - 7.8s ("আজকে এমন কিছু সিক্রেট টেকনিক্স নিয়ে কথা বলবো...")
 * Pause: 7.8s - 8.3s
 * Phrase 3: 8.3s - 11.6s ("ভিডিওটি ভালো লাগলে লাইক ও শেয়ার করতে ভুলবেন না!")
 * Ending: 11.6s - 12.0s
 */
export function generateCreatorVoiceAudio(durationSeconds = 12): { blob: Blob; url: string; duration: number } {
  const sampleRate = 44100;
  const totalSamples = Math.round(sampleRate * durationSeconds);
  const samples = new Float32Array(totalSamples);

  const baseF0 = 152; // Slightly higher, energetic young creator vocal pitch

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Sentence active windows
    let sentenceEnvelope = 0;
    if (t >= 0.15 && t <= 3.8) {
      sentenceEnvelope = Math.sin(((t - 0.15) / 3.65) * Math.PI);
    } else if (t >= 4.2 && t <= 7.8) {
      sentenceEnvelope = Math.sin(((t - 4.2) / 3.6) * Math.PI);
    } else if (t >= 8.3 && t <= 11.6) {
      sentenceEnvelope = Math.sin(((t - 8.3) / 3.3) * Math.PI);
    }

    if (sentenceEnvelope <= 0.001) {
      // Warm studio mic acoustic floor
      samples[i] = (Math.random() - 0.5) * 0.004;
      continue;
    }

    // Syllable rhythm: ~5.6 syllables per second (fast, enthusiastic creator rhythm)
    const syllablePhase = (t * 5.6 * 2 * Math.PI) % (2 * Math.PI);
    const syllableEnvelope = Math.pow(Math.sin(syllablePhase * 0.5), 1.6) * 0.75 + 0.25;

    // Dynamic pitch bounce: youthful enthusiasm
    const bounce = Math.sin(t * 3.5) * 12 + Math.cos(t * 7) * 6;
    const f0 = baseF0 + bounce;

    // Podcaster broadcast mic proximity effect (boosted warm low-mid ~180-240Hz, crisp presence ~3.2kHz)
    const glottal = Math.sin(2 * Math.PI * f0 * t) * 0.42 + Math.sin(2 * Math.PI * (f0 * 2) * t) * 0.28;
    const chestResonance = Math.sin(2 * Math.PI * 220 * t) * 0.22; // Podcaster mic proximity
    const f1 = Math.sin(2 * Math.PI * 620 * t) * 0.32;
    const f2 = Math.sin(2 * Math.PI * 1720 * t) * 0.28;
    const f3 = Math.sin(2 * Math.PI * 3200 * t) * 0.18; // Crisp treble clarity

    // Energetic consonant transients
    const friction = (Math.random() - 0.5) * (Math.sin(syllablePhase) > 0.7 ? 0.09 : 0.015);

    const voiceSignal = (glottal + chestResonance + f1 + f2 + f3 + friction) * syllableEnvelope * sentenceEnvelope * 0.58;
    samples[i] = Math.max(-0.95, Math.min(0.95, voiceSignal));
  }

  const { blob, url } = createWavBlob(sampleRate, samples);
  return { blob, url, duration: durationSeconds };
}

// Backwards compatibility generator
export function generateSyntheticVoiceAudio(durationSeconds = 12, style: 'anchor' | 'creator' = 'anchor'): { blob: Blob; url: string; duration: number } {
  if (style === 'creator') {
    return generateCreatorVoiceAudio(durationSeconds);
  }
  return generateAnchorVoiceAudio(durationSeconds);
}

export function generateSyntheticBeepAudio(): { blob: Blob; url: string } {
  const result = generateAnchorVoiceAudio(12);
  return { blob: result.blob, url: result.url };
}
