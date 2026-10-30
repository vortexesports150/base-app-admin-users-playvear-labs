/**
 * Generates and downloads an SRT subtitle file from Bengali script text and audio duration.
 * Provides precise word-by-word time-to-time timestamps matching spoken speech rhythm.
 */
export function generateSrtContent(scriptText: string = '', totalDuration: number = 5): string {
  if (!scriptText || !scriptText.trim()) {
    return '1\n00:00:00,000 --> 00:00:05,000\n[Bangla Audio]\n';
  }

  // Extract all words while preserving Bengali & English characters and punctuation
  const words = scriptText.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return '1\n00:00:00,000 --> 00:00:05,000\n[Bangla Audio]\n';
  }

  const duration = totalDuration > 0 ? totalDuration : Math.max(1, words.length * 0.45);

  // Calculate weighted word duration based on character count and natural pauses
  const wordWeights = words.map((word) => {
    let weight = Math.max(1, word.length);
    // Add extra pause weight for punctuation endings
    if (/[।!?]$/.test(word)) {
      weight += 2.2;
    } else if (/[,;]$/.test(word)) {
      weight += 1.0;
    }
    return weight;
  });

  const totalWeight = wordWeights.reduce((sum, w) => sum + w, 0);

  let currentTime = 0;
  let srtOutput = '';

  words.forEach((word, index) => {
    const weight = wordWeights[index];
    const rawWordDuration = (weight / totalWeight) * duration;
    
    // Ensure smooth minimum display time (at least 150ms)
    const wordDuration = Math.max(0.15, rawWordDuration);
    const startTime = currentTime;
    let endTime = startTime + wordDuration;

    // Boundary check: last word should finish at or slightly before total duration
    if (index === words.length - 1) {
      endTime = Math.max(startTime + 0.2, duration);
    } else if (endTime > duration) {
      endTime = duration;
    }

    srtOutput += `${index + 1}\n`;
    srtOutput += `${formatSrtTimestamp(startTime)} --> ${formatSrtTimestamp(endTime)}\n`;
    srtOutput += `${word}\n\n`;

    currentTime = endTime;
  });

  return srtOutput;
}

function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.min(999, Math.floor((seconds % 1) * 1000));

  const pad = (num: number, size: number = 2) => String(num).padStart(size, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

export function downloadSrtFile(
  scriptText?: string,
  duration?: number,
  filename: string = 'subtitle.srt'
): void {
  const content = generateSrtContent(scriptText, duration);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanFilename = (filename || 'subtitle').replace(/[^a-zA-Z0-9_\u0980-\u09FF.-]/g, '_');
  a.download = cleanFilename.endsWith('.srt') ? cleanFilename : `${cleanFilename}.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
