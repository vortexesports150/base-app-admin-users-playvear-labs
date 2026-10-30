import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HistoryVoiceItem,
  HistoryVideoItem,
  downloadVoiceMP3,
  downloadVideoMP4,
} from '../services/historyStorage';
import {
  X,
  Play,
  Pause,
  Download,
  Trash2,
  HardDrive,
  Clock,
  RotateCcw,
  Check,
  FileText,
  Volume2,
  Search,
  AlertTriangle,
  Film,
  Video as VideoIcon,
  Maximize2,
} from 'lucide-react';
import { PlayvearIcon } from './PlayvearIcon';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItems: HistoryVoiceItem[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onSelectScript?: (script: string) => void;
  videoHistoryItems?: HistoryVideoItem[];
  onDeleteVideoItem?: (id: string) => void;
  onClearAllVideos?: () => void;
  defaultTab?: 'voice' | 'video';
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyItems = [],
  onDeleteItem,
  onClearAll,
  onSelectScript,
  videoHistoryItems = [],
  onDeleteVideoItem,
  onClearAllVideos,
  defaultTab = 'voice',
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'video'>(defaultTab);

  // Voice player states
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);

  // Video player states
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [previewVideoItem, setPreviewVideoItem] = useState<HistoryVideoItem | null>(null);

  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const audioPlayPromiseRef = useRef<Promise<void> | null>(null);
  const activeVideoBlobUrlRef = useRef<string | null>(null);

  // Keep active tab in sync with defaultTab when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultTab) setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Stop media and cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        if (audioPlayPromiseRef.current) {
          audioPlayPromiseRef.current
            .then(() => {
              if (audioRef.current) audioRef.current.pause();
            })
            .catch(() => {});
        } else {
          try {
            audioRef.current.pause();
          } catch {}
        }
      }
      setPlayingVoiceId(null);
      setPlayingVideoId(null);
      setPreviewVideoItem(null);
      setShowClearConfirmModal(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }
      if (activeVideoBlobUrlRef.current) {
        URL.revokeObjectURL(activeVideoBlobUrlRef.current);
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
      }
    };
  }, []);

  // Listen to Escape key or custom back event to close modal / clear confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewVideoItem) {
          setPreviewVideoItem(null);
        } else if (showClearConfirmModal) {
          setShowClearConfirmModal(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    const handleCloseConfirmEvent = () => {
      setShowClearConfirmModal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('close-clear-confirm-modal', handleCloseConfirmEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('close-clear-confirm-modal', handleCloseConfirmEvent);
    };
  }, [isOpen, onClose, showClearConfirmModal, previewVideoItem]);

  if (!isOpen) return null;

  // ------------------- VOICE PLAYBACK -------------------
  const handleVoicePlayToggle = (item: HistoryVoiceItem) => {
    if (playingVoiceId === item.id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          const promise = audioRef.current.play();
          audioPlayPromiseRef.current = promise;
          promise.catch((err) => {
            if (err?.name !== 'AbortError' && !err?.message?.includes('interrupted')) {
              console.error(err);
            }
          });
        } else {
          if (audioPlayPromiseRef.current) {
            audioPlayPromiseRef.current
              .then(() => {
                if (audioRef.current) audioRef.current.pause();
              })
              .catch(() => {});
          } else {
            try {
              audioRef.current.pause();
            } catch {}
          }
          setPlayingVoiceId(null);
        }
      }
      return;
    }

    // Clean up previous audio blob url
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
    }

    try {
      const byteCharacters = atob(item.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: item.mimeType || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      activeAudioUrlRef.current = url;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      if (!audioRef.current.paused) {
        if (audioPlayPromiseRef.current) {
          audioPlayPromiseRef.current
            .then(() => {
              if (audioRef.current) audioRef.current.pause();
            })
            .catch(() => {});
        } else {
          try {
            audioRef.current.pause();
          } catch {}
        }
      }

      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setVoiceCurrentTime(audioRef.current.currentTime);
          setVoiceDuration(audioRef.current.duration || 0);
        }
      };
      audioRef.current.onended = () => {
        setPlayingVoiceId(null);
        setVoiceCurrentTime(0);
      };

      const promise = audioRef.current.play();
      audioPlayPromiseRef.current = promise;
      promise.catch((err) => {
        if (err?.name !== 'AbortError' && !err?.message?.includes('interrupted')) {
          console.error('Failed to play audio from history:', err);
        }
      });
      setPlayingVoiceId(item.id);
    } catch (err) {
      console.error('Failed to play audio from history:', err);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setVoiceCurrentTime(val);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyScript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // ------------------- VIDEO PLAYBACK -------------------
  const handleOpenVideoPreview = (item: HistoryVideoItem) => {
    // Stop any playing audio
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }

    if (activeVideoBlobUrlRef.current) {
      URL.revokeObjectURL(activeVideoBlobUrlRef.current);
      activeVideoBlobUrlRef.current = null;
    }

    let resolvedSrc = item.videoUrl;
    if (item.videoBlob) {
      resolvedSrc = URL.createObjectURL(item.videoBlob);
      activeVideoBlobUrlRef.current = resolvedSrc;
    }

    setActiveVideoSrc(resolvedSrc);
    setPreviewVideoItem(item);
    setPlayingVideoId(item.id);
  };

  const handleCloseVideoPreview = () => {
    if (activeVideoBlobUrlRef.current) {
      URL.revokeObjectURL(activeVideoBlobUrlRef.current);
      activeVideoBlobUrlRef.current = null;
    }
    setActiveVideoSrc(null);
    setPreviewVideoItem(null);
    setPlayingVideoId(null);
  };

  const getCharacterBadgeStyle = (charId: string) => {
    switch (charId) {
      case 'news_anchor':
        return 'bg-red-950/80 border-red-500/50 text-red-300';
      case 'reviewer':
        return 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300';
      case 'caster':
        return 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300';
      case 'bounty':
        return 'bg-amber-950/70 border-amber-500/40 text-amber-300';
      case 'mystery_teller':
        return 'bg-teal-950/70 border-teal-500/40 text-teal-300';
      case 'nature_poet':
        return 'bg-lime-950/70 border-lime-500/40 text-lime-300';
      case 'horror_thriller':
        return 'bg-purple-950/80 border-purple-500/50 text-purple-300';
      default:
        return 'bg-stone-800 border-stone-600 text-stone-300';
    }
  };

  // Filtered lists
  const filteredVoiceItems = searchQuery.trim()
    ? historyItems.filter(
        (item) =>
          item.script.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.characterName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : historyItems;

  const filteredVideoItems = searchQuery.trim()
    ? videoHistoryItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.prompt && item.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : videoHistoryItems;

  const currentCount = activeTab === 'voice' ? historyItems.length : videoHistoryItems.length;

  const modalElement = (
    <div
      id="history-modal-backdrop"
      style={{ zIndex: 99999 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-in fade-in duration-200"
    >
      {/* FULLSCREEN MODAL CONTAINER */}
      <div
        id="history-modal-content"
        className="w-full h-full max-w-6xl mx-auto flex flex-col bg-[#0b0e14] border-x border-stone-800/80 text-stone-100 shadow-2xl overflow-hidden relative"
      >
        {/* Fullscreen Header Bar */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-stone-800/90 bg-[#10141d]/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              {activeTab === 'voice' ? <Volume2 className="w-5 h-5" /> : <Film className="w-5 h-5 text-fuchsia-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-stone-100 tracking-tight">
                  {activeTab === 'voice' ? 'Voice History' : 'Video History'}
                </h2>
                <span className="text-xs font-bold bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                  {currentCount} {activeTab === 'voice' ? (currentCount === 1 ? 'Voice' : 'Voices') : (currentCount === 1 ? 'Video' : 'Videos')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Saved locally in device storage (Offline Cache)</span>
              </div>
            </div>
          </div>

          {/* Search bar & Controls */}
          <div className="flex items-center gap-3">
            {currentCount > 0 && (
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'voice' ? 'Search voice script...' : 'Search video title...'}
                  className="w-full bg-[#161c28] text-xs text-stone-200 placeholder-stone-500 pl-9 pr-3 py-2 rounded-xl border border-stone-800 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all"
                />
              </div>
            )}

            {/* Clear All Option */}
            {currentCount > 0 && (
              <button
                id="clear-all-text-btn"
                type="button"
                onClick={() => setShowClearConfirmModal(true)}
                className="text-[11px] font-normal text-stone-400 hover:text-rose-400 hover:underline cursor-pointer transition-colors p-0 bg-transparent border-0 shrink-0"
              >
                Clear all
              </button>
            )}

            {/* Fullscreen Close Button */}
            <button
              id="close-history-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-stone-400 hover:text-white bg-[#161c28] hover:bg-stone-800 border border-stone-800 rounded-xl transition-all cursor-pointer shadow-sm hover:border-stone-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Voice History vs Video History */}
        <div className="flex items-center px-5 pt-3 pb-1 border-b border-stone-800/60 bg-[#0e121a]">
          <div className="flex items-center gap-2 p-1 bg-[#141a26] border border-stone-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('voice');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'voice'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>ভয়েস হিস্ট্রি ({historyItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('video');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>ভিডিও হিস্ট্রি ({videoHistoryItems.length})</span>
            </button>
          </div>
        </div>

        {/* Fullscreen Body / History List Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {/* ===================== TAB 1: VOICE HISTORY ===================== */}
          {activeTab === 'voice' && (
            <>
              {historyItems.length === 0 ? (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#141a24] border border-stone-800 flex items-center justify-center text-stone-500 mb-4 shadow-inner">
                    <Volume2 className="w-8 h-8 text-cyan-500/60" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-200 mb-1.5">
                    No Voice History Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-md leading-relaxed">
                    Generated audio files are automatically saved to your device's local storage. They will appear here for playback and download anytime.
                  </p>
                </div>
              ) : filteredVoiceItems.length === 0 ? (
                <div className="py-16 text-center text-stone-400 text-sm">
                  No matching voice history found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVoiceItems.map((item) => {
                    const isPlaying = playingVoiceId === item.id;
                    const isExpanded = expandedId === item.id;
                    const isScriptLong = item.script.length > 180;
                    const displayText =
                      isExpanded || !isScriptLong
                        ? item.script
                        : item.script.slice(0, 180) + '...';

                    return (
                      <div
                        key={item.id}
                        id={`history-item-${item.id}`}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isPlaying
                            ? 'bg-[#121a28] border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                            : 'bg-[#10141d] border-stone-800/90 hover:border-stone-700/90 hover:bg-[#131823]'
                        }`}
                      >
                        {/* Item Header */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-lg border ${getCharacterBadgeStyle(
                                  item.character
                                )}`}
                              >
                                {item.characterName}
                              </span>
                              <span className="text-[11px] text-stone-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-stone-500" />
                                {item.formattedDate}
                              </span>
                            </div>

                            {/* Top Actions: Load Script, Copy, Delete */}
                            <div className="flex items-center gap-1">
                              {onSelectScript && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectScript(item.script);
                                    onClose();
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-cyan-300 hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer"
                                  title="Load script into editor"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleCopyScript(item.id, item.script)}
                                className="p-1.5 text-stone-400 hover:text-cyan-300 hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer"
                                title="Copy script text"
                              >
                                {copiedId === item.id ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (playingVoiceId === item.id && audioRef.current) {
                                    audioRef.current.pause();
                                    setPlayingVoiceId(null);
                                  }
                                  onDeleteItem(item.id);
                                }}
                                className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete from device storage"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Script Content */}
                          <p className="text-xs text-stone-300 font-sans leading-relaxed whitespace-pre-wrap">
                            {displayText}
                          </p>
                          {isScriptLong && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="text-[11px] text-cyan-400 hover:underline mt-1 font-semibold"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </div>

                        {/* Player Controls & Download */}
                        <div className="flex items-center gap-3 pt-3 border-t border-stone-800/80">
                          {/* Play/Pause Button */}
                          <button
                            type="button"
                            onClick={() => handleVoicePlayToggle(item)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isPlaying
                                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                : 'bg-[#182030] hover:bg-[#202c42] text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>

                          {/* Scrub bar & Time tracker */}
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                              <span>{isPlaying ? formatTime(voiceCurrentTime) : '0:00'}</span>
                              <span>{isPlaying && voiceDuration ? formatTime(voiceDuration) : 'Audio'}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={isPlaying && voiceDuration ? voiceDuration : 100}
                              step="0.01"
                              value={isPlaying ? voiceCurrentTime : 0}
                              onChange={isPlaying ? handleSeek : undefined}
                              disabled={!isPlaying}
                              className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40 disabled:cursor-default"
                            />
                          </div>

                          {/* Direct Download MP3 */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => downloadVoiceMP3(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600/90 hover:bg-fuchsia-500 active:scale-95 text-white font-semibold text-xs rounded-lg border border-fuchsia-400/40 shadow-sm transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>MP3</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ===================== TAB 2: VIDEO HISTORY ===================== */}
          {activeTab === 'video' && (
            <>
              {videoHistoryItems.length === 0 ? (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#141a24] border border-stone-800 flex items-center justify-center text-stone-500 mb-4 shadow-inner">
                    <Film className="w-8 h-8 text-fuchsia-500/60" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-200 mb-1.5">
                    No Video History Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-md leading-relaxed">
                    When you generate a video in Step 2 with HeyGen (via Fal.ai), it is automatically cached to your device's local storage and saved here. You can watch and download it anytime offline without using any online hosting.
                  </p>
                </div>
              ) : filteredVideoItems.length === 0 ? (
                <div className="py-16 text-center text-stone-400 text-sm">
                  No matching video history found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVideoItems.map((item) => {
                    return (
                      <div
                        key={item.id}
                        id={`history-video-${item.id}`}
                        className="p-3.5 rounded-2xl border border-stone-800/90 bg-[#10141d] hover:border-cyan-500/40 hover:bg-[#131823] transition-all flex flex-col justify-between gap-3 shadow-lg"
                      >
                        {/* Video Card Header: Name & Date */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-white truncate max-w-[200px]" title={item.title}>
                              {item.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => onDeleteVideoItem?.(item.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete from device storage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Video Details: Date & Time, Duration, Resolution */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-400 mb-2.5 font-mono">
                            <span className="flex items-center gap-1 bg-stone-900/90 px-2 py-0.5 rounded border border-stone-800">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              {item.formattedDate}
                            </span>
                            <span className="bg-cyan-950/70 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                              {item.duration}s
                            </span>
                            <span className="bg-stone-900/90 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                              {item.resolution}
                            </span>
                            <span className="bg-fuchsia-950/50 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/30">
                              {item.model}
                            </span>
                          </div>

                          {/* Video Thumbnail / Preview Click Area */}
                          <div
                            onClick={() => handleOpenVideoPreview(item)}
                            className="relative aspect-[9/16] max-h-56 sm:max-h-64 mx-auto w-full bg-black rounded-xl overflow-hidden border border-cyan-500/30 group cursor-pointer shadow-inner flex items-center justify-center"
                          >
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-[#0e1624] to-[#080d16] flex flex-col items-center justify-center text-cyan-400">
                                <Film className="w-8 h-8 opacity-60" />
                              </div>
                            )}

                            {/* Play Overlay Button */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                              <div className="w-12 h-12 rounded-full bg-cyan-500/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)] group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 ml-0.5 fill-black" />
                              </div>
                            </div>

                            {/* Offline cache badge */}
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-cyan-500/30 text-[9px] text-cyan-300 flex items-center gap-1">
                              <HardDrive className="w-2.5 h-2.5" />
                              <span>Device Stored</span>
                            </div>
                          </div>
                        </div>

                        {/* Video Card Footer: Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                          <button
                            type="button"
                            onClick={() => handleOpenVideoPreview(item)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Play Video</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadVideoMP4(item)}
                            className="py-1.5 px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold border border-fuchsia-400/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            title="Download MP4 to device"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Fullscreen Footer */}
        <div className="flex-shrink-0 px-6 py-3.5 border-t border-stone-800/90 bg-[#10141d]/95 backdrop-blur-md flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <PlayvearIcon className="w-4 h-4" />
            <span>
              {activeTab === 'voice'
                ? `Total Stored Voices: ${historyItems.length}`
                : `Total Stored Videos: ${videoHistoryItems.length}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-100 font-semibold rounded-xl transition-all cursor-pointer border border-stone-700"
          >
            Close
          </button>
        </div>

        {/* ===================== VIDEO PLAYER MODAL PREVIEW ===================== */}
        {previewVideoItem && activeVideoSrc && (
          <div
            id="video-player-preview-overlay"
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="w-full max-w-sm bg-[#0c1018] border border-cyan-500/50 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3 relative animate-in zoom-in-95">
              {/* Close preview button */}
              <button
                type="button"
                onClick={handleCloseVideoPreview}
                className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-white bg-black/60 rounded-full border border-stone-700 transition-colors cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-full text-left pr-8">
                <h4 className="text-xs font-bold text-white truncate">{previewVideoItem.title}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5 font-mono">
                  <span>{previewVideoItem.formattedDate}</span>
                  <span>•</span>
                  <span>{previewVideoItem.duration}s</span>
                  <span>•</span>
                  <span className="text-cyan-400">{previewVideoItem.resolution}</span>
                </div>
              </div>

              {/* Responsive 9:16 Portrait Video Player */}
              <div className="relative w-full max-w-[270px] aspect-[9/16] bg-black rounded-xl overflow-hidden border border-cyan-500/40 shadow-2xl">
                <video
                  src={activeVideoSrc}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Action buttons inside preview */}
              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => downloadVideoMP4(previewVideoItem)}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseVideoPreview}
                  className="py-2 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DEDICATED CONFIRMATION MODAL FOR CLEAR ALL */}
        {showClearConfirmModal && (
          <div
            id="clear-all-confirmation-modal"
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="w-full max-w-sm bg-[#131722] border border-rose-500/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-100 mb-1">
                  {activeTab === 'voice' ? 'Clear all voice history?' : 'Clear all video history?'}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  This will permanently delete all {currentCount} saved {activeTab === 'voice' ? 'audio' : 'video'} records from your device's local storage. This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-300 hover:text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer border border-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'voice') {
                      onClearAll();
                    } else if (onClearAllVideos) {
                      onClearAllVideos();
                    }
                    setShowClearConfirmModal(false);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};
