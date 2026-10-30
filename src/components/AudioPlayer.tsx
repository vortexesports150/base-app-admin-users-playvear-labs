import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, FileText } from 'lucide-react';
import { downloadSrtFile } from '../utils/subtitleGenerator';

interface AudioPlayerProps {
  audioUrl: string;
  characterId: string;
  scriptText?: string;
  onDownloadRaw: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  characterId,
  scriptText = '',
  onDownloadRaw,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset playback on audioUrl change and reload audio element
  useEffect(() => {
    if (audioRef.current) {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            audioRef.current?.pause();
          })
          .catch(() => {});
      } else {
        try {
          audioRef.current.pause();
        } catch {
          // Ignore
        }
      }
      try {
        audioRef.current.load();
      } catch {
        // Ignore
      }
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset error state on click so user can retry playing
    setHasError(false);

    if (isPlaying && !audio.paused) {
      try {
        audio.pause();
      } catch (err) {
        console.warn('Pause error:', err);
      }
      setIsPlaying(false);
    } else {
      try {
        // Ensure audio element has loaded the latest audio source
        if (audio.readyState === 0 || audio.error) {
          audio.load();
        }
        const promise = audio.play();
        playPromiseRef.current = promise;
        await promise;
        setIsPlaying(true);
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('interrupted')) {
          setIsPlaying(false);
          return;
        }
        console.error('Playback error, attempting reload and play:', err);
        try {
          audio.load();
          const retryPromise = audio.play();
          playPromiseRef.current = retryPromise;
          await retryPromise;
          setIsPlaying(true);
        } catch (retryErr: any) {
          console.error('Audio playback retry error:', retryErr);
          setIsPlaying(false);
        }
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const target = e.currentTarget;
    if (!audioUrl || !target.currentSrc) {
      return;
    }
    if (target.error && target.error.code !== 0) {
      console.warn('Voice playback notice:', target.error.message || target.error.code);
      setHasError(true);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setHasError(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownloadSubtitle = () => {
    const safeDuration = duration || (audioRef.current?.duration ?? 0);
    downloadSrtFile(scriptText, safeDuration, `${characterId || 'voice'}-subtitle.srt`);
  };

  return (
    <div id="audio-player-layout" className="w-full flex flex-col items-center gap-3">
      {/* Primary Voice Audio Element */}
      <audio
        key={audioUrl}
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => setHasError(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
      />

      {/* Main Voice Player Bar */}
      <div
        id="voice-play-layout"
        className="w-full bg-gradient-to-r from-[#090e19]/95 via-[#0c1424]/95 to-[#160c22]/95 text-stone-100 rounded-2xl p-4 sm:p-5 border border-cyan-500/40 shadow-[0_0_30px_rgba(0,243,255,0.12)] flex items-center gap-3 sm:gap-4 backdrop-blur-xl"
      >
        {/* Play/Pause Button - 20% Neon Magenta Accent */}
        <button
          id="audio-play-toggle-btn"
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-400 hover:to-fuchsia-500 active:from-fuchsia-700 active:to-fuchsia-800 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,0,234,0.6)] hover:shadow-[0_0_28px_rgba(255,0,234,0.85)] border border-fuchsia-300"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1.5">
          <input
            id="audio-progress-bar"
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#060a12] border border-cyan-950/60 rounded-lg appearance-none cursor-pointer accent-[#00f3ff]"
          />
          <div className="flex justify-between text-xs text-cyan-300 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          id="audio-mute-toggle-btn"
          type="button"
          onClick={toggleMute}
          aria-label="Toggle mute"
          className="p-2 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Minimalist Text-Only Action Links */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs select-none pt-0.5">
        <button
          id="download-mp3-button"
          type="button"
          onClick={onDownloadRaw}
          className="text-cyan-300 hover:text-white hover:drop-shadow-[0_0_8px_#00f3ff] hover:underline cursor-pointer transition-colors p-0 bg-transparent border-0 font-bold"
        >
          Download MP3
        </button>

        <span className="text-fuchsia-500/60 font-bold">|</span>

        <button
          id="download-subtitle-button"
          type="button"
          onClick={handleDownloadSubtitle}
          className="text-cyan-300 hover:text-white hover:drop-shadow-[0_0_8px_#00f3ff] hover:underline cursor-pointer transition-colors p-0 bg-transparent border-0 font-bold"
          title="Download auto-timed Subtitle (.srt)"
        >
          Subtitle (.SRT)
        </button>
      </div>

      {/* Subtitle Bangla Notice */}
      <div
        id="subtitle-info-notice"
        className="w-full max-w-xl mx-auto mt-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-[#0a1220] to-fuchsia-950/40 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,243,255,0.12)] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-stone-300 animate-in fade-in"
      >
        <div className="flex items-center gap-2 text-center sm:text-left">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:block" />
          <span className="font-medium text-stone-100">
            Download and save the subtitle for future use.
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownloadSubtitle}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500/25 to-fuchsia-500/20 hover:from-cyan-500/40 hover:to-fuchsia-500/35 text-cyan-200 hover:text-white border border-cyan-400/60 shadow-[0_0_12px_rgba(0,243,255,0.25)] text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95"
          title="Download SRT Subtitle"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download (.SRT)</span>
        </button>
      </div>
    </div>
  );
};
