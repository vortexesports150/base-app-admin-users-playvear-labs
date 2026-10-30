import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Play, Pause, Volume2, Check, Trash2 } from 'lucide-react';
import { PlayvearIcon } from '../../components/PlayvearIcon';
import { VoiceRecorder, generateSyntheticBeepAudio } from '../utils/audio';

interface AudioUploaderProps {
  selectedAudioUrl?: string;
  selectedAudioName?: string;
  detectedDuration?: number | null;
  onSelectAudio: (url: string, name: string, duration?: number) => void;
  onClearAudio: () => void;
}

// Measure actual audio length in seconds using metadata loading
const measureAudioDuration = (audioSrc: string): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = audioSrc;
    audio.onloadedmetadata = () => {
      resolve(audio.duration || 0);
    };
    audio.onerror = () => {
      resolve(0);
    };
  });
};

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedAudioUrl,
  selectedAudioName,
  detectedDuration,
  onSelectAudio,
  onClearAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startLiveRecording = async () => {
    try {
      recorderRef.current = new VoiceRecorder();
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 15) {
            stopLiveRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Mic access error:', err);
      alert('Microphone access denied or not available. Please allow microphone permission.');
    }
  };

  const stopLiveRecording = async () => {
    if (!recorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const { url } = await recorderRef.current.stop();
      setIsRecording(false);
      const measured = await measureAudioDuration(url);
      const seconds = measured > 0 ? measured : recordSeconds;
      const rounded = Math.min(15, Math.max(5, Math.round(seconds)));
      onSelectAudio(url, `voice_recording_${rounded}s.wav`, rounded);
    } catch (err) {
      console.error('Stop recording error:', err);
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const measured = await measureAudioDuration(dataUrl);
        const rounded = measured > 0 ? Math.min(15, Math.max(5, Math.round(measured))) : 10;
        onSelectAudio(dataUrl, file.name, rounded);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so re-selecting same file works
    event.target.value = '';
  };

  const handleCreateSampleAudio = () => {
    const { url } = generateSyntheticBeepAudio();
    onSelectAudio(url, 'sample_broadcast_voice_track.wav', 5);
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current || !selectedAudioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-indigo-400" />
          <span>২. প্রেজেন্টারের অডিও ও কণ্ঠ (Voice & Audio Track)</span>
        </label>
        <span className="text-xs text-slate-500">MP3, WAV, M4A · 5s - 15s</span>
      </div>

      {/* Audio Selection or Active Player */}
      {selectedAudioUrl ? (
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 shadow-md transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                  {selectedAudioName || 'Audio Track Ready'}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> অডিও লোড হয়েছে
                  </span>
                  {detectedDuration && (
                    <span className="text-[10px] text-indigo-300 bg-indigo-900/60 border border-indigo-700/50 px-1.5 py-0.2 rounded font-mono">
                      দৈর্ঘ্য: {detectedDuration} সেকেন্ড (ভিডিও অটো-সিঙ্ক)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearAudio}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Remove audio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <audio
            ref={audioPlayerRef}
            src={selectedAudioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <p className="text-[11px] text-slate-400">
            এই অডিওর আওয়াজ ও কথা অনুযায়ী প্রেজেন্টার কথা বলবে এবং ঠোঁট মেলাবে।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Microhpone Live Record and Upload Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Live Mic Record */}
            <button
              type="button"
              onClick={isRecording ? stopLiveRecording : startLiveRecording}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center ${
                isRecording
                  ? 'border-rose-500 bg-rose-950/30 text-rose-300 ring-2 ring-rose-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="relative">
                {isRecording ? (
                  <Square className="h-5 w-5 text-rose-400" />
                ) : (
                  <Mic className="h-5 w-5 text-indigo-400" />
                )}
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold mt-2">
                {isRecording ? `রেকর্ড থামান (${recordSeconds}s)` : 'মাইক্রোফোনে রেকর্ড করুন'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {isRecording ? 'ক্লিক করে শেষ করুন' : 'সরাসরি মুখে কথা বলুন'}
              </span>
            </button>

            {/* Audio File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-300 text-center transition-all"
            >
              <Upload className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-semibold mt-2">অডিও ফাইল আপলোড</span>
              <span className="text-[10px] text-slate-500 mt-0.5">MP3 বা WAV নির্বাচন করুন</span>
            </button>
          </div>

          {/* Quick Sample Voice Button */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/30">
            <div className="text-xs text-slate-400">
              ফাইল নেই? টেস্ট করতে স্যাম্পল অডিও ব্যবহার করুন:
            </div>
            <button
              type="button"
              onClick={handleCreateSampleAudio}
              className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 rounded-md transition-colors flex items-center gap-1.5"
            >
              <PlayvearIcon className="h-3 w-3" /> স্যাম্পল অডিও লোড
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
