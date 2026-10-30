/**
 * Converts 16-bit linear PCM audio buffer to standard WAV format.
 */
export function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitDepth = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

let cachedMp3EncoderClass: any = null;

async function getMp3EncoderClass() {
  if (!cachedMp3EncoderClass) {
    const lame = await import('@breezystack/lamejs');
    cachedMp3EncoderClass = lame.Mp3Encoder || (lame as any).default?.Mp3Encoder;
  }
  return cachedMp3EncoderClass;
}

/**
 * Converts 16-bit linear PCM audio buffer to standard MP3 format.
 */
export async function pcmToMp3(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  channels = 1,
  kbps = 128
): Promise<{ buffer: Buffer; format: 'mp3' | 'wav'; mimeType: string }> {
  try {
    const Mp3Encoder = await getMp3EncoderClass();
    if (!Mp3Encoder) {
      throw new Error('Mp3Encoder is not available');
    }

    const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
    const sampleCount = Math.floor(pcmBuffer.length / 2);
    const samples = new Int16Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      samples[i] = pcmBuffer.readInt16LE(i * 2);
    }

    const mp3Chunks: Buffer[] = [];
    const chunkSize = 1152;

    for (let i = 0; i < samples.length; i += chunkSize) {
      const chunk = samples.subarray(i, i + chunkSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Chunks.push(Buffer.from(mp3buf));
      }
    }

    const mp3End = mp3encoder.flush();
    if (mp3End && mp3End.length > 0) {
      mp3Chunks.push(Buffer.from(mp3End));
    }

    if (mp3Chunks.length === 0) {
      const wavBuf = pcmToWav(pcmBuffer, sampleRate, channels, 16);
      return { buffer: wavBuf, format: 'wav', mimeType: 'audio/wav' };
    }

    const mp3Buffer = Buffer.concat(mp3Chunks);
    return { buffer: mp3Buffer, format: 'mp3', mimeType: 'audio/mpeg' };
  } catch (err) {
    console.error('Error during MP3 encoding, falling back to valid WAV:', err);
    const wavBuf = pcmToWav(pcmBuffer, sampleRate, channels, 16);
    return { buffer: wavBuf, format: 'wav', mimeType: 'audio/wav' };
  }
}
