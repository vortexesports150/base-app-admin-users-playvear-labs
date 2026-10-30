import React, { useRef } from 'react';
import { Download, Play, RefreshCw, Maximize2, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { PlayvearIcon } from '../../components/PlayvearIcon';
import { STUDIO_BACKDROP } from '../data/presets';

interface VideoPlayerProps {
  videoUrl?: string;
  isGenerating: boolean;
  generationStage: string;
  previewImageUrl?: string;
  prompt: string;
  duration: number;
  resolution: string;
  costUsd: number;
  costBdt: number;
  errorMessage?: string;
  onRetry?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isGenerating,
  generationStage,
  previewImageUrl,
  prompt,
  duration,
  resolution,
  costUsd,
  costBdt,
  errorMessage,
  onRetry,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `playvear_presenter_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
          <span className="text-xs font-semibold text-white tracking-wide uppercase">
            লাইভ স্টুডিও মনিটর (Studio Monitor)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>{resolution}</span>
          <span aria-hidden="true">·</span>
          <span>{duration}s</span>
        </div>
      </div>

      {/* Screen Frame */}
      <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center">
        {isGenerating ? (
          /* Generating State */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <PlayvearIcon className="h-6 w-6 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">ভিডিও তৈরি হচ্ছে...</p>
              <p className="text-xs text-indigo-300 font-mono mt-1">{generationStage}</p>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs">
              HeyGen এবং Fal.ai ক্লাউডে অডিও ও ছবির সমন্বয়ে লাইভ প্রেজেন্টার রেন্ডারিং চলছে। সাধারণত ৩০-৫০ সেকেন্ড সময় নেয়।
            </p>
          </div>
        ) : errorMessage ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-950/50 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-rose-300">ভিডিও জেনারেশনে সমস্যা হয়েছে</p>
            <p className="text-xs text-slate-400 max-w-sm px-4">{errorMessage}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> আবার চেষ্টা করুন
              </button>
            )}
          </div>
        ) : videoUrl ? (
          /* Video Playback State */
          <div className="relative h-full w-full group">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          /* Idle / Standby Preview State */
          <div className="relative h-full w-full overflow-hidden">
            <img
              src={previewImageUrl || STUDIO_BACKDROP}
              alt="Studio preview"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-40 blur-[1px]"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent">
              {previewImageUrl ? (
                <div className="h-20 w-20 rounded-xl overflow-hidden border-2 border-indigo-500/60 shadow-lg mb-3">
                  <img
                    src={previewImageUrl}
                    alt="Presenter avatar preview"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 mb-3 border border-slate-700">
                  <Play className="h-5 w-5 ml-0.5 text-indigo-400" />
                </div>
              )}
              <p className="text-sm font-medium text-slate-200">
                {previewImageUrl ? 'প্রেজেন্টার প্রস্তুত রয়েছে' : 'ছবি ও অডিও সিলেক্ট করে জেনারেট করুন'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                বাম পাশের প্যানেল থেকে ইনপুট দিয়ে "Generate Presenter Video" বাটনে ক্লিক করুন
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video Action Controls when Completed */}
      {videoUrl && !isGenerating && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <DollarSign className="h-3.5 w-3.5" /> আনুমানিক খরচ: ${costUsd.toFixed(2)} (৳{costBdt.toFixed(0)})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleFullscreen}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ডাউনলোড ভিডিও (MP4)</span>
            </button>
          </div>
        </div>
      )}

      {/* Prompt summary info */}
      <div className="mt-4 rounded-lg bg-slate-950/60 p-3 border border-slate-800/70 text-xs">
        <span className="text-slate-400 block font-medium mb-1">প্রম্পট নির্দেশনা:</span>
        <p className="text-slate-300 italic line-clamp-2">{prompt || 'Default broadcast presenter prompt'}</p>
      </div>
    </div>
  );
};
