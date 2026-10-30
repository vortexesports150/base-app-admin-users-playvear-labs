import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  Play,
  Pause,
  Trash2,
  Film,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Share2,
  Check,
} from 'lucide-react';
import { GenerationHistoryItem, UserProfile } from '../types';
import { PlayvearIcon } from '../../components/PlayvearIcon';

interface GeneratedVideosScreenProps {
  videos: GenerationHistoryItem[];
  currentUser?: UserProfile | null;
  onOpenSignIn?: () => void;
  onBackToStudio: () => void;
  onPlayInStudio: (video: GenerationHistoryItem) => void;
  onDeleteVideo: (id: string) => void;
  onClearAllVideos?: () => void;
}

export const GeneratedVideosScreen: React.FC<GeneratedVideosScreenProps> = ({
  videos,
  currentUser,
  onOpenSignIn,
  onBackToStudio,
  onPlayInStudio,
  onDeleteVideo,
  onClearAllVideos,
}) => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct video download handler
  const handleDownload = async (item: GenerationHistoryItem) => {
    if (downloadingId === item.id) return;
    setDownloadingId(item.id);

    try {
      const fileName = `playvear_${item.id}.mp4`;
      let downloaded = false;

      // 1. Try direct blob fetch
      try {
        const response = await fetch(item.videoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          downloaded = true;
        }
      } catch (fetchErr) {
        console.warn('Direct fetch failed, falling back to server proxy:', fetchErr);
      }

      // 2. Server attachment proxy fallback
      if (!downloaded) {
        const proxyUrl = `/api/download-video?url=${encodeURIComponent(item.videoUrl)}&name=${encodeURIComponent(fileName)}`;
        const link = document.createElement('a');
        link.href = proxyUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyLink = async (item: GenerationHistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.videoUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'সম্প্রতি';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-slate-100 flex flex-col font-sans">
      {/* TOP SUB-HEADER / NAVIGATION */}
      <div className="sticky top-0 z-30 w-full px-4 sm:px-8 py-3.5 bg-[#000000]/95 backdrop-blur-md border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>স্টুডিওতে ফিরুন</span>
          </button>

          <div className="flex items-center gap-2 pl-2">
            <div className="h-7 w-7 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>জেনারেটেড ভিডিও</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 text-[10px] font-mono">
                  {videos.length} টি ভিডিও
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right Action: Create New Video Button */}
        <div className="flex items-center gap-2">
          {videos.length > 0 && onClearAllVideos && (
            <button
              type="button"
              onClick={onClearAllVideos}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs transition-colors cursor-pointer"
              title="সব মুছে ফেলুন"
            >
              <Trash2 className="h-3 w-3" />
              <span>লিস্ট ক্লিয়ার করুন</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black text-xs font-bold shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <PlayvearIcon className="h-3.5 w-3.5" />
            <span>নতুন ভিডিও তৈরি</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {videos.length === 0 ? (
          /* EMPTY STATE */
          <div className="min-h-[55vh] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-950/80 via-black to-fuchsia-950/60 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_35px_rgba(0,240,255,0.25)]">
              <Film className="h-9 w-9 text-cyan-400" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-fuchsia-500 shadow-[0_0_10px_#ff007f] animate-ping" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">এখনও কোনো ভিডিও জেনারেট করা হয়নি</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                স্টুডিওতে গিয়ে যেকোনো উপস্থাপক ছবি ও ভয়েস দিয়ে সহজেই আপনার প্রথম এআই ভিডিও তৈরি করুন। তৈরি করা সব ভিডিও এখানে সংরক্ষিত থাকবে।
              </p>
            </div>

            <button
              type="button"
              onClick={onBackToStudio}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black text-xs font-bold shadow-[0_0_20px_rgba(0,240,255,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer mt-2"
            >
              <PlayvearIcon className="h-4 w-4" />
              <span>ভিডিও স্টুডিওতে যান</span>
            </button>
          </div>
        ) : (
          /* GRID LAYOUT FOR GENERATED VIDEOS */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 pb-1 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>সব ভিডিও ({videos.length}) — ৯:১৬ পোর্ট্রেট</span>
                <span className="text-neutral-600 hidden sm:inline">•</span>
                <span className="text-[11px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  {currentUser ? `লোকাল স্টোরেজ: ${currentUser.email}` : 'গেস্ট অ্যাকাউন্ট (লোকাল স্টোরেজ)'}
                </span>
              </div>
              {!currentUser && onOpenSignIn && (
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                >
                  <span>গুগল অ্যাকাউন্টে সেভ রাখতে সাইন-ইন করুন</span>
                  <span>→</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {videos.map((item) => {
                const isPlaying = playingVideoId === item.id;
                const isDownloading = downloadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden bg-[#070b14] border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.12)] hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] flex flex-col"
                  >
                    {/* VIDEO PLAYER CONTAINER (9:16 VERTICAL REEL) */}
                    <div className="relative w-full aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                      <video
                        id={`gallery_video_${item.id}`}
                        src={item.videoUrl}
                        playsInline
                        loop
                        poster={item.imageUrl}
                        className="w-full h-full object-cover"
                        onPlay={() => setPlayingVideoId(item.id)}
                        onPause={() => {
                          if (playingVideoId === item.id) setPlayingVideoId(null);
                        }}
                      />

                      {/* Top Badges Overlay */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                        <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-cyan-400/40 text-cyan-300 text-[10px] font-mono shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                          {item.duration || 12}s
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-fuchsia-400/40 text-fuchsia-300 text-[10px] font-mono shadow-[0_0_8px_rgba(255,0,128,0.3)]">
                          {item.resolution || '768p'}
                        </span>
                      </div>

                      {/* Play / Pause Center Overlay Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const vidEl = document.getElementById(`gallery_video_${item.id}`) as HTMLVideoElement;
                          if (vidEl) {
                            if (vidEl.paused) {
                              vidEl.play().catch(() => {});
                              setPlayingVideoId(item.id);
                            } else {
                              vidEl.pause();
                              setPlayingVideoId(null);
                            }
                          }
                        }}
                        className={`absolute inset-0 m-auto h-12 w-12 rounded-full bg-black/70 backdrop-blur-md border border-cyan-400/70 text-cyan-300 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-110 active:scale-95 cursor-pointer z-10 ${
                          isPlaying ? 'opacity-0 group-hover:opacity-90' : 'opacity-100'
                        }`}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                      </button>

                      {/* Bottom Gradient Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                    </div>

                    {/* CARD INFO & CONTROLS */}
                    <div className="p-3 bg-[#0a0f1c] flex flex-col justify-between flex-1 space-y-2.5 border-t border-cyan-900/40">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-cyan-400" />
                            <span>{formatDate(item.createdAt)}</span>
                          </span>
                          <span className="text-cyan-400 text-[10px]">HeyGen AI</span>
                        </div>

                        {/* Prompt Snippet */}
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed" title={item.prompt}>
                          {item.prompt || 'Professional talking presenter video'}
                        </p>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="pt-1 flex items-center gap-1.5 border-t border-neutral-800/80">
                        {/* 1. Direct Download Button */}
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          disabled={isDownloading}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 text-xs font-semibold shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_16px_rgba(0,240,255,0.35)] transition-all cursor-pointer disabled:opacity-50"
                          title="সরাসরি ডাউনলোড করুন"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                              <span className="text-[11px]">ডাউনলোড...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5 text-cyan-400" />
                              <span className="text-[11px]">ডাউনলোড</span>
                            </>
                          )}
                        </button>

                        {/* 2. Play in Studio Button */}
                        <button
                          type="button"
                          onClick={() => onPlayInStudio(item)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-900 hover:bg-cyan-950/60 border border-neutral-700 hover:border-cyan-400 text-neutral-300 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
                          title="স্টুডিও প্লেয়ারে দেখুন"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>

                        {/* 3. Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(item)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-900 hover:bg-cyan-950/60 border border-neutral-700 hover:border-cyan-400 text-neutral-300 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
                          title={copiedId === item.id ? 'কপি হয়েছে!' : 'ভিডিও লিংক কপি করুন'}
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3.5 w-3.5 text-cyan-400" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* 4. Delete Video */}
                        <button
                          type="button"
                          onClick={() => onDeleteVideo(item.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-900 hover:bg-rose-950/60 border border-neutral-700 hover:border-rose-500/60 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer shadow-sm"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
