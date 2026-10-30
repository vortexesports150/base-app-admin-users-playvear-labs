/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Mic,
  Square,
  ArrowUp,
  X,
  RotateCcw,
  Download,
  Volume2,
  Image as ImageIcon,
  AlertCircle,
  Play,
  Pause,
  Settings2,
  Radio,
  Video,
  Check,
  Upload,
  Loader2,
  Film,
  User,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, deductUserCredits, getPricingSettings, saveGenerationHistory } from '../lib/firebase';
import { PlayvearIcon } from '../components/PlayvearIcon';
import { ApiStatusModal } from './components/ApiStatusModal';
import { GeneratedVideosScreen } from './components/GeneratedVideosScreen';
import { AuthScreen } from './components/AuthScreen';
import { VideoHelpModal } from './components/VideoHelpModal';
import { GenerationHistoryItem, UserProfile } from './types';
import {
  VoiceRecorder,
  generateAnchorVoiceAudio,
  generateCreatorVoiceAudio,
  blobUrlToDataUri,
  getAudioDuration,
  convertAudioBlobToWav,
} from './utils/audio';
import { PRESET_PRESENTERS } from './data/presets';
import { saveVideoToDevice } from '../services/historyStorage';


export interface VideoGeneratorProps {
  onOpenVoiceGenerator?: () => void;
}

export default function VideoGeneratorScreen({ onOpenVoiceGenerator }: VideoGeneratorProps = {}) {
  // Current Authenticated User (saved in localStorage or synced from playvear_google_user)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const googleUserStr = localStorage.getItem('playvear_google_user');
      if (googleUserStr) {
        const gu = JSON.parse(googleUserStr);
        if (gu && gu.email) {
          return {
            id: gu.uid || 'google_user',
            name: gu.displayName || gu.email.split('@')[0],
            email: gu.email,
            photoUrl: gu.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            provider: 'google',
            signedInAt: new Date().toISOString(),
          };
        }
      }
      const saved = localStorage.getItem('playvear_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Listen to cross-tab / auth updates to keep user synced
  useEffect(() => {
    const handleSyncAuth = () => {
      try {
        const googleUserStr = localStorage.getItem('playvear_google_user');
        if (googleUserStr) {
          const gu = JSON.parse(googleUserStr);
          if (gu && gu.email) {
            setCurrentUser({
              id: gu.uid || 'google_user',
              name: gu.displayName || gu.email.split('@')[0],
              email: gu.email,
              photoUrl: gu.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              provider: 'google',
              signedInAt: new Date().toISOString(),
            });
            return;
          }
        }
        const saved = localStorage.getItem('playvear_current_user');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch {}
    };

    window.addEventListener('storage', handleSyncAuth);
    return () => window.removeEventListener('storage', handleSyncAuth);
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Screen View: 'studio' | 'gallery' (Generated Videos Screen)
  const [currentView, setCurrentView] = useState<'studio' | 'gallery'>('studio');

  // Helper to derive per-user localStorage key
  const getStorageKey = (user: UserProfile | null) => {
    if (!user) return 'playvear_generated_videos_guest';
    return `playvear_generated_videos_${user.email.toLowerCase()}`;
  };

  // Generated Videos History for current user (persisted in localStorage per user)
  const [generatedVideos, setGeneratedVideos] = useState<GenerationHistoryItem[]>([]);

  // Sync generated videos whenever currentUser changes (strictly from localStorage, no online server storage)
  useEffect(() => {
    const key = getStorageKey(currentUser);
    let localItems: GenerationHistoryItem[] = [];
    try {
      const saved = localStorage.getItem(key);
      if (saved) localItems = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load user videos from localStorage:', e);
    }
    setGeneratedVideos(localItems);
  }, [currentUser]);

  const handleSignIn = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('playvear_current_user', JSON.stringify(user));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setIsAuthModalOpen(false);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('playvear_current_user');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setCurrentVideoUrl(null);
  };

  // Top Tabs: Chat & ✦ Work
  const [activeTab, setActiveTab] = useState<'chat' | 'work'>('chat');

  // Selected Preset ID ('bd-tv-anchor' | 'bd-content-creator' | 'custom')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('bd-tv-anchor');

  // API Config Status
  const [isConfigured, setIsConfigured] = useState(false);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Attached Media in Bottom Input Box
  const [attachedImage, setAttachedImage] = useState<string | null>(PRESET_PRESENTERS[0].imagePath);
  const [attachedImageName, setAttachedImageName] = useState<string>(PRESET_PRESENTERS[0].banglaName + ' (টিভি উপস্থাপক)');
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const [attachedVideoName, setAttachedVideoName] = useState<string>('');
  const [attachedAudio, setAttachedAudio] = useState<string | null>(null);
  const [attachedAudioName, setAttachedAudioName] = useState<string>(PRESET_PRESENTERS[0].audioName);
  const [audioDuration, setAudioDuration] = useState<number>(12);
  const [isAudioPreviewPlaying, setIsAudioPreviewPlaying] = useState(false);

  // Prompt Text in Input Box
  const [inputPrompt, setInputPrompt] = useState<string>(PRESET_PRESENTERS[0].recommendedPrompt);

  // User's Recently Uploaded Custom Image (persisted in localStorage)
  const [recentCustomImage, setRecentCustomImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem('playvear_recent_custom_image');
    } catch {
      return null;
    }
  });

  // Generation Settings (Default: 768p)
  const [resolution, setResolution] = useState<'768p' | '1080p'>('768p');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVideoHelpOpen, setIsVideoHelpOpen] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Video Player & Generation State
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Polishing details');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const portraitVideoRef = useRef<HTMLVideoElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const micTimerRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);

  // Check Backend FAL_KEY Status
  const checkConfigStatus = async () => {
    try {
      const res = await fetch('/api/config-status');
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.configured);
        setKeyPrefix(data.keyPrefix);
      }
    } catch (err) {
      console.warn('API status check error:', err);
    }
  };

  // Dynamic Default Prompt Logic based on attachments
  useEffect(() => {
    const IMAGE_ONLY_PROMPT = 'রেফারেন্স পোর্ট্রেট ছবি থেকে উচ্চমানের টকিং অ্যাভাটার ভিডিও তৈরি করুন। ছবির ব্যক্তির মুখাবয়ব, চুল, পোশাক এবং ব্যাকগ্রাউন্ড ১০০% অবিকল ও অপরিবর্তিত রাখুন। প্রদত্ত অডিওর বাচনভঙ্গির সাথে নিখুঁত লিপ-সিঙ্ক, স্বাভাবিক চোখের পলক এবং সাবলীল মাথার নড়াচড়া সহ একজন প্রফেশনাল ও প্রাণবন্ত প্রেজেন্টারের মতো সরাসরি ক্যামেরার দিকে তাকিয়ে কথা বলার রিয়েলিস্টিক ভিডিও তৈরি করুন।';
    const IMAGE_VIDEO_PROMPT = PRESET_PRESENTERS[0].recommendedPrompt;

    setInputPrompt(current => {
      // Only auto-update if current prompt is empty or one of our defaults
      const isDefault = !current || current === IMAGE_ONLY_PROMPT || current === IMAGE_VIDEO_PROMPT || PRESET_PRESENTERS.some(p => p.recommendedPrompt === current);
      if (!isDefault) return current;

      if (attachedImage && !attachedVideo) {
        return IMAGE_ONLY_PROMPT;
      } else if (attachedImage && attachedVideo) {
        return IMAGE_VIDEO_PROMPT;
      }
      return current;
    });
  }, [attachedImage, attachedVideo]);

  // Switch Character Preset (loads 9:16 portrait image, tailored 12s audio track, and Bangla prompt)
  const applyPreset = (presetId: string) => {
    const preset = PRESET_PRESENTERS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setAttachedImage(preset.imagePath);
    setAttachedImageName(preset.title);
    setAttachedVideo(null);
    setAttachedVideoName('');
    setInputPrompt(preset.recommendedPrompt);
    setAudioDuration(12);
    setErrorMessage(null);

    // Generate accurate 12-second speech cadence track for this character
    try {
      const audioResult =
        preset.audioStyle === 'creator'
          ? generateCreatorVoiceAudio(12)
          : generateAnchorVoiceAudio(12);

      blobUrlToDataUri(audioResult.blob).then((dataUri) => {
        setAttachedAudio(dataUri);
      }).catch(() => {
        setAttachedAudio(audioResult.url);
      });
      setAttachedAudioName(preset.audioName);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
        setIsAudioPreviewPlaying(false);
      }
    } catch (e) {
      console.warn('Preset voice init failed:', e);
    }
  };

  useEffect(() => {
    checkConfigStatus();
    // Initialize with Farhan Ahmed (TV Anchor) preset on first load
    applyPreset('bd-tv-anchor');
  }, []);

  // Handle Custom Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const imageResult = reader.result;
        setAttachedImage(imageResult);
        setAttachedImageName(file.name);
        setSelectedPresetId('custom');
        setRecentCustomImage(imageResult);
        try {
          localStorage.setItem('playvear_recent_custom_image', imageResult);
        } catch (err) {
          console.warn('Failed to save recent custom image to localStorage:', err);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setIsMenuOpen(false);
  };

  // Handle Custom Video Reference Upload (Strict 10 MB Size Limit - Optional Motion Reference)
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 10 MB size limit check (10 * 1024 * 1024 bytes)
    const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_VIDEO_BYTES) {
      const actualMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`রেফারেন্স ভিডিও ফাইলের সাইজ সর্বোচ্চ ১০ MB হতে হবে! (আপনার ফাইলের সাইজ: ${actualMb} MB)`);
      e.target.value = '';
      setIsMenuOpen(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const videoResult = reader.result;
        setAttachedVideo(videoResult);
        setAttachedVideoName(file.name);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setIsMenuOpen(false);
  };

  // Handle Custom Audio File Upload with accurate duration and WAV conversion
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Convert to clean standard 16-bit 44.1kHz PCM WAV
      const wavResult = await convertAudioBlobToWav(file);
      const exactSeconds = Math.max(5, Math.min(15, Math.round(wavResult.duration || 5)));
      setAttachedAudio(wavResult.dataUri);
      setAttachedAudioName(file.name);
      setAudioDuration(exactSeconds);
    } catch (err) {
      console.warn('Audio upload conversion error, falling back to direct reader:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachedAudio(reader.result);
          setAttachedAudioName(file.name);
          setAudioDuration(5);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    setIsMenuOpen(false);
  };

  // Microphone Recording Handler
  const startLiveRecording = async () => {
    try {
      recorderRef.current = new VoiceRecorder();
      await recorderRef.current.start();
      recordStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordSeconds(0);

      micTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic error:', err);
      alert('Microphone access is denied or not supported.');
    }
  };

  const stopLiveRecording = async () => {
    if (!recorderRef.current) return;
    if (micTimerRef.current) clearInterval(micTimerRef.current);

    const wallClockSeconds = recordStartTimeRef.current > 0
      ? (Date.now() - recordStartTimeRef.current) / 1000
      : recordSeconds;

    try {
      const { blob, elapsedSeconds } = await recorderRef.current.stop();
      setIsRecording(false);

      // Convert recorded WebM/Opus into clean standard 16-bit 44.1kHz PCM WAV for HeyGen
      try {
        const wavResult = await convertAudioBlobToWav(blob);
        const exactSeconds = Math.max(5, Math.min(15, Math.round(wavResult.duration || elapsedSeconds || wallClockSeconds || 5)));
        setAttachedAudio(wavResult.dataUri);
        setAttachedAudioName(`Live Voice Record (${exactSeconds}s)`);
        setAudioDuration(exactSeconds);
      } catch (convErr) {
        console.warn('WAV conversion fallback for recording:', convErr);
        const dataUri = await blobUrlToDataUri(blob);
        const exactSeconds = Math.max(5, Math.min(15, Math.round(elapsedSeconds || wallClockSeconds || 5)));
        setAttachedAudio(dataUri);
        setAttachedAudioName(`Live Voice Record (${exactSeconds}s)`);
        setAudioDuration(exactSeconds);
      }
    } catch (err) {
      console.error('Mic stop error:', err);
      setIsRecording(false);
    }
  };

  // Toggle Audio Preview
  const toggleAudioPreview = () => {
    if (!audioPreviewRef.current || !attachedAudio) return;
    if (isAudioPreviewPlaying) {
      audioPreviewRef.current.pause();
      setIsAudioPreviewPlaying(false);
    } else {
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current.play().then(() => {
        setIsAudioPreviewPlaying(true);
      }).catch((e) => {
        console.warn('Audio play failed:', e);
        setIsAudioPreviewPlaying(false);
      });
    }
  };

  // Toggle Video Playback in Portrait Player
  const toggleVideoPlayback = () => {
    if (!portraitVideoRef.current || !currentVideoUrl) {
      toggleAudioPreview();
      return;
    }
    if (isVideoPlaying) {
      portraitVideoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      portraitVideoRef.current.play().then(() => {
        setIsVideoPlaying(true);
      }).catch((e) => {
        console.warn('Video play error:', e);
        setIsVideoPlaying(false);
      });
    }
  };

  // Reset / Clear Session
  const handleResetSession = () => {
    setCurrentVideoUrl(null);
    setAttachedVideo(null);
    setAttachedVideoName('');
    applyPreset('bd-tv-anchor');
    setErrorMessage(null);
    setIsGenerating(false);
  };

  // Load and play a generated video directly in the Studio
  const handlePlayInStudio = (videoItem: GenerationHistoryItem) => {
    setCurrentVideoUrl(videoItem.videoUrl);
    if (videoItem.imageUrl) {
      setAttachedImage(videoItem.imageUrl);
      setAttachedImageName('Presenter Image');
    }
    if (videoItem.prompt) {
      setInputPrompt(videoItem.prompt);
    }
    setCurrentView('studio');
    setTimeout(() => {
      videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (portraitVideoRef.current) {
        portraitVideoRef.current.load();
        portraitVideoRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
      }
    }, 300);
  };

  // Delete a generated video from local history
  const handleDeleteVideo = (id: string) => {
    setGeneratedVideos((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      try {
        const key = getStorageKey(currentUser);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      return updated;
    });
  };

  // Clear all generated videos from local history
  const handleClearAllVideos = () => {
    if (window.confirm('Are you sure you want to delete all generated videos for this account?')) {
      setGeneratedVideos([]);
      try {
        const key = getStorageKey(currentUser);
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }
  };

  // Direct In-Site Video Download Handler
  const handleDownloadVideo = async () => {
    if (!currentVideoUrl || isDownloading) return;

    try {
      setIsDownloading(true);
      const fileName = `playvear_${selectedPresetId || 'presenter'}_video.mp4`;

      // Method 1: Try in-browser direct blob fetch & save
      let downloaded = false;
      try {
        const response = await fetch(currentVideoUrl);
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
        console.warn('Direct blob fetch failed, falling back to server download proxy:', fetchErr);
      }

      // Method 2: Server-side attachment proxy with Content-Disposition (guaranteed direct download)
      if (!downloaded) {
        const proxyUrl = `/api/download-video?url=${encodeURIComponent(currentVideoUrl)}&name=${encodeURIComponent(fileName)}`;
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
      setIsDownloading(false);
    }
  };

  // Real-time Firestore Credit Sync for Video Generator
  const [userCredit, setUserCredit] = useState<number>(0);
  useEffect(() => {
    if (!currentUser?.id) {
      setUserCredit(0);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (typeof data.credits === 'number') setUserCredit(data.credits);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Pricing Settings for estimation
  const [pricingSettings, setPricingSettings] = useState<{ heygenRate: number; v4CharRate: number }>({ heygenRate: 2.64, v4CharRate: 7.2 });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'pricing'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const hRate = typeof data?.heygenRate === 'number' && data.heygenRate > 0 && data.heygenRate < 50 ? data.heygenRate : 2.64;
        const vRate = typeof data?.v4CharRate === 'number' && data.v4CharRate > 0 && data.v4CharRate < 100 ? data.v4CharRate : 7.2;
        setPricingSettings({
          heygenRate: hRate,
          v4CharRate: vRate
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const estimatedCreditCost = (audioDuration || 12) * (pricingSettings.heygenRate || 2.64);

  // Send & Generate Request
  const handleSend = async () => {
    if (isGenerating) return;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!isConfigured) {
      setIsApiModalOpen(true);
      return;
    }

    if (!attachedImage && !attachedVideo && !inputPrompt) return;

    // Credit Check for HeyGen Video
    const requiredCredits = estimatedCreditCost;

    if (userCredit < requiredCredits) {
      setErrorMessage(`আপনার পর্যাপ্ত ক্রেডিট নেই। এই ভিডিওটি তৈরি করতে প্রায় ${requiredCredits.toFixed(2)} ক্রেডিট প্রয়োজন। বর্তমান ব্যালেন্স: ${userCredit.toFixed(2)} ক্রেডিট।`);
      // Trigger event to open credits modal if possible, or just keep error
      window.dispatchEvent(new CustomEvent('open-credits-modal'));
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setCurrentProgress(14);
    setCurrentStatus('Polishing details');

    // Smooth progress simulation matching HeyGen video render (typically 25-35s)
    let progressVal = 14;
    const progressInterval = setInterval(() => {
      progressVal += Math.random() * 3.5 + 1.2;
      if (progressVal > 94) progressVal = 94;
      setCurrentProgress(Math.round(progressVal));

      if (progressVal > 65) {
        setCurrentStatus('Polishing details');
      } else if (progressVal > 40) {
        setCurrentStatus('Lip-sync & Studio Scene Generation...');
      } else if (progressVal > 20) {
        setCurrentStatus('Video Frame Encoding...');
      }
    }, 1100);

    try {
      // Ensure audio payload is converted to Base64 Data URI if it is a local blob URL
      let audioPayload = attachedAudio;
      if (attachedAudio && attachedAudio.startsWith('blob:')) {
        try {
          audioPayload = await blobUrlToDataUri(attachedAudio);
        } catch (convErr) {
          console.warn('Blob audio conversion fallback:', convErr);
        }
      }

      const IMAGE_ONLY_PROMPT = 'রেফারেন্স পোর্ট্রেট ছবি থেকে উচ্চমানের টকিং অ্যাভাটার ভিডিও তৈরি করুন। ছবির ব্যক্তির মুখাবয়ব, চুল, পোশাক এবং ব্যাকগ্রাউন্ড ১০০% অবিকল ও অপরিবর্তিত রাখুন। প্রদত্ত অডিওর বাচনভঙ্গির সাথে নিখুঁত লিপ-সিঙ্ক, স্বাভাবিক চোখের পলক এবং সাবলীল মাথার নড়াচড়া সহ একজন প্রফেশনাল ও প্রাণবন্ত প্রেজেন্টারের মতো সরাসরি ক্যামেরার দিকে তাকিয়ে কথা বলার রিয়েলিস্টিক ভিডিও তৈরি করুন।';
      const IMAGE_VIDEO_PROMPT = PRESET_PRESENTERS[0].recommendedPrompt;

      // Logic: If user hasn't typed a custom prompt, use dynamic defaults
      let finalPrompt = inputPrompt;
      if (!finalPrompt || finalPrompt === IMAGE_ONLY_PROMPT || finalPrompt === IMAGE_VIDEO_PROMPT || PRESET_PRESENTERS.some(p => p.recommendedPrompt === finalPrompt)) {
        if (attachedImage && !attachedVideo) {
          finalPrompt = IMAGE_ONLY_PROMPT;
        } else if (attachedImage && attachedVideo) {
          finalPrompt = IMAGE_VIDEO_PROMPT;
        } else {
          finalPrompt = IMAGE_VIDEO_PROMPT; // Final fallback
        }
      }

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          imageUrl: attachedImage,
          videoUrl: attachedVideo,
          audioUrl: audioPayload,
          duration: Math.max(5, Math.min(60, Math.round(audioDuration || 12))),
          resolution,
          model: 'heygen/heygen-video/reference-to-video',
        }),
      });

      clearInterval(progressInterval);
      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'FAL_KEY_MISSING') {
          setIsApiModalOpen(true);
          throw new Error('FAL_KEY is not configured. Please add your key in the secret panel.');
        }
        throw new Error(result.message || 'Error in video generation.');
      }

      // Deduct credits on success
      if (currentUser?.id) {
        try {
          const cost = (audioDuration || 12) * (pricingSettings.heygenRate || 4.8);
          await deductUserCredits(currentUser.id, cost);
        } catch (e) {
          console.warn('Credit deduction error:', e);
        }
      }

      setCurrentProgress(100);
      setCurrentStatus('Video creation completed!');

      const finalVideoUrl = result.videoUrl || result.data?.video?.url || result.data?.url;
      if (finalVideoUrl) {
        setCurrentVideoUrl(finalVideoUrl);

        // Clean imageUrl so multi-megabyte base64 images don't overflow localStorage quota
        const safeImageUrl = attachedImage && !attachedImage.startsWith('data:') ? attachedImage : undefined;

        // Auto-save to Generated Videos History & localStorage
        const newHistoryItem: GenerationHistoryItem = {
          id: 'vid_' + Date.now(),
          videoUrl: finalVideoUrl,
          prompt: inputPrompt || (selectedPresetId ? PRESET_PRESENTERS.find((p) => p.id === selectedPresetId)?.recommendedPrompt || 'AI Presenter Video' : 'AI Presenter Video'),
          imageUrl: safeImageUrl,
          audioName: attachedAudioName || 'Audio Voiceover',
          duration: Math.max(5, Math.min(15, Math.round(audioDuration || 12))),
          resolution,
          model: 'HeyGen Video',
          costUsd: 0.24,
          costBdt: 28,
          createdAt: new Date().toISOString(),
        };

        setGeneratedVideos((prev) => {
          const updated = [newHistoryItem, ...prev.filter((v) => v.videoUrl !== finalVideoUrl)];
          try {
            const key = getStorageKey(currentUser);
            localStorage.setItem(key, JSON.stringify(updated));
          } catch (e) {
            console.warn('LocalStorage error:', e);
          }
          return updated;
        });

        // Save to generation history for admin panel
        if (currentUser?.id) {
          const duration = Math.max(5, Math.min(15, Math.round(audioDuration || 12)));
          const cost = duration * 2.2;
          const charge = duration * (pricingSettings.heygenRate || 2.64);
          const profit = charge - cost;

          saveGenerationHistory({
            id: 'video_' + Date.now(),
            type: 'video',
            model: 'HeyGen Video',
            userId: currentUser.id,
            userEmail: currentUser.email || '',
            duration: duration,
            cost,
            charge,
            profit,
            isPaid: true,
            status: 'completed'
          });
        }

        // Deduct credits for generated video
        if (currentUser?.id) {
          try {
            await deductUserCredits(currentUser.id, estimatedCreditCost);
          } catch (e) {
            console.warn('Video credit deduction error:', e);
          }
        }

        // Immediately cache and save video directly to device IndexedDB (strictly local storage, no online server)
        const videoTitle = selectedPresetId
          ? (PRESET_PRESENTERS.find((p) => p.id === selectedPresetId)?.title || 'Presenter')
          : attachedImageName || 'AI Presenter Video';

        saveVideoToDevice({
          title: videoTitle,
          videoUrl: finalVideoUrl,
          thumbnailUrl: safeImageUrl,
          duration: Math.max(5, Math.min(15, Math.round(audioDuration || 12))),
          resolution,
          model: 'HeyGen Video (Fal.ai)',
          prompt: inputPrompt || (selectedPresetId ? PRESET_PRESENTERS.find((p) => p.id === selectedPresetId)?.recommendedPrompt || 'AI Presenter Video' : 'AI Presenter Video'),
        }).catch((err) => console.warn('Failed to cache video to local device storage:', err));

        // After showing 'জেনারেট সম্পন্ন / জেনারেট ডান' in the marked area, smoothly glide down to the video player
        setTimeout(() => {
          videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (portraitVideoRef.current) {
            portraitVideoRef.current.load();
            portraitVideoRef.current.play().catch(() => {});
            setIsVideoPlaying(true);
          }
        }, 1200);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Generation error:', err);
      setErrorMessage(err.message || 'ভিডিও জেনারেট করা সম্ভব হয়নি।');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full flex-1 bg-transparent text-slate-100 flex flex-col font-sans">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
        className="hidden"
      />

      {/* Hidden Audio Player for Preview */}
      {attachedAudio && (
        <audio
          ref={audioPreviewRef}
          src={attachedAudio}
          onEnded={() => setIsAudioPreviewPlaying(false)}
          onError={() => setIsAudioPreviewPlaying(false)}
          className="hidden"
        />
      )}

      {/* VIEW CONDITIONAL: GALLERY SCREEN OR MAIN STUDIO */}
      {currentView === 'gallery' ? (
        <GeneratedVideosScreen
          videos={generatedVideos}
          currentUser={currentUser}
          onOpenSignIn={() => setIsAuthModalOpen(true)}
          onBackToStudio={() => setCurrentView('studio')}
          onPlayInStudio={handlePlayInStudio}
          onDeleteVideo={handleDeleteVideo}
          onClearAllVideos={handleClearAllVideos}
        />
      ) : (
      <main className="w-full max-w-2xl mx-auto px-3 sm:px-4 flex flex-col items-center">
        {/* FIRST SCREEN VIEWPORT SECTION: DOCKS CHATGPT INPUT BOX AT SCREEN BOTTOM ON MOBILE */}
        <section className="w-full min-h-[calc(100dvh-8.5rem)] sm:min-h-[calc(100dvh-9rem)] flex flex-col justify-between pb-2 pt-1">
          {/* TOP / CENTER: HERO & STATUS DISPLAY */}
          <div className="flex-1 flex flex-col items-center justify-center w-full my-auto">
            {/* If Error occurred */}
            {errorMessage && (
              <div className="w-full mb-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-2.5 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* MARKED HERO & STATUS AREA (ABOVE CHATGPT INPUT BOX) */}
            <div className="w-full flex flex-col items-center justify-center py-4 text-center">
          {isGenerating ? (
            /* 1. STATUS DURING GENERATION: RICH STATUS, ANIMATED DOT MATRIX (80% CYAN, 20% MAGENTA) & PROGRESS */
            <div className="w-full flex flex-col items-center justify-center space-y-3.5 animate-in fade-in duration-300">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#07131e] border border-cyan-400/60 text-cyan-300 text-xs font-medium shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500 shadow-[0_0_6px_#ff007f]" />
                  </span>
                  <span>{currentStatus}</span>
                </div>
                <p className="text-xs text-neutral-400 font-mono">
                  Generating <span className="text-cyan-400 font-semibold">{audioDuration}s</span> video by HeyGen AI...
                </p>
              </div>

              {/* Glowing Dot Matrix Visualizer: 80% Neon Cyan, 20% Neon Magenta */}
              <div className="relative w-48 h-28 flex items-center justify-center bg-black/90 rounded-none border border-cyan-500/40 p-2.5 shadow-[0_0_30px_rgba(0,240,255,0.25)]">
                <div className="grid grid-cols-11 gap-1.5">
                  {Array.from({ length: 66 }).map((_, i) => {
                    const isActive = (i + Math.floor(currentProgress / 2)) % 6 === 0;
                    // Exactly 20% Neon Magenta, 80% Neon Cyan
                    const isMagenta = i % 5 === 0;
                    const neonColor = isMagenta ? '#ff007f' : '#00f0ff';
                    const glowShadow = isMagenta ? '0 0 10px #ff007f' : '0 0 10px #00f0ff';
                    const idleColor = isMagenta ? '#280c20' : '#0d1f2d';

                    return (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 transition-all duration-700"
                        style={{
                          backgroundColor: isActive ? neonColor : idleColor,
                          boxShadow: isActive ? glowShadow : 'none',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Progress Percentage Badge */}
                <div className="absolute bottom-1.5 right-1.5 bg-[#07131e]/95 text-cyan-300 font-mono text-[11px] px-2 py-0.5 rounded-none border border-cyan-400/50 backdrop-blur-sm shadow-[0_0_10px_rgba(0,240,255,0.25)]">
                  {currentProgress}%
                </div>
              </div>

              {/* Animated Progress Bar: 80% Cyan with Magenta punch tip */}
              <div className="w-56 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-fuchsia-500 shadow-[0_0_12px_rgba(0,240,255,0.5)] transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          ) : currentVideoUrl ? (
            /* 2. GENERATION COMPLETE: 'জেনারেট সম্পন্ন / জেনারেট ডান' (GENERATION DONE) MESSAGE */
            <div className="w-full flex flex-col items-center justify-center space-y-2.5 py-2 animate-in fade-in zoom-in-95 duration-300">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-cyan-950/90 to-fuchsia-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)]">
                <PlayvearIcon className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                  <span className="text-cyan-400 text-lg font-bold">✓</span> Generation Done <span className="text-fuchsia-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/40">Done</span>
                </h2>
                <p className="text-xs text-neutral-400 max-w-sm">
                  The video has been successfully created and added to the video player below.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black text-xs font-bold shadow-[0_0_20px_rgba(0,240,255,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Watch video below</span>
                  <span className="animate-bounce">👇</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentVideoUrl(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-fuchsia-950/40 hover:bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-medium transition-colors cursor-pointer shadow-[0_0_10px_rgba(255,0,128,0.2)]"
                  title="নতুন ভিডিও তৈরি করুন"
                >
                  <RotateCcw className="h-3 w-3 text-fuchsia-400" />
                  <span>New Video</span>
                </button>
              </div>
            </div>
          ) : (
            /* 3. DEFAULT IDLE STATE: PLAYVEAR LAB STUDIO WELCOME */
            <div className="w-full flex flex-col items-center justify-center py-2 text-center">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-cyan-950/80 via-black to-fuchsia-950/50 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                <PlayvearIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_#ff007f] animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHATGPT-STYLE INPUT TEXT BOX (CARD - DOCKED AT SCREEN BOTTOM) */}
      <div className="w-full rounded-2xl sm:rounded-3xl bg-[#0f121a] border border-cyan-500/40 p-2.5 sm:p-3 shadow-[0_0_20px_rgba(0,240,255,0.12)] space-y-1.5 shrink-0 focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.2)] transition-all">
          {/* Top Media Row: Photo, Video, Audio & Mic Recorder in ONE SINGLE ROW */}
          <div className="flex items-center justify-between gap-2 border-b border-cyan-950/60 pb-1.5">
            {/* Left: Attached Media Chips (Photo, Video, Audio) side by side */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 max-w-[calc(100%-2.75rem)]">
              {/* Attached Photo Thumbnail (Compact 36px) */}
              {attachedImage && (
                <div className="relative group rounded-lg overflow-hidden border border-cyan-500/60 h-9 w-9 bg-neutral-900 shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.25)]">
                  <img
                    src={attachedImage}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  {/* Close (X) button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedImage(null);
                      setAttachedImageName('');
                      setSelectedPresetId('custom');
                    }}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white flex items-center justify-center transition-all shadow-[0_0_8px_#ff007f] cursor-pointer z-10"
                    title="Remove photo"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              {/* Attached Video Chip */}
              {attachedVideo && (
                <div className="flex items-center gap-1.5 bg-cyan-950/90 px-2.5 py-1 rounded-full border border-cyan-400/60 text-[11px] text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0">
                  <Film className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span className="font-mono truncate max-w-[100px] sm:max-w-[150px]">
                    {attachedVideoName || 'Reference Video'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsVideoHelpOpen(true)}
                    className="text-cyan-400 hover:text-white transition-colors cursor-pointer"
                    title="ভিডিও নির্দেশিকা দেখুন"
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedVideo(null);
                      setAttachedVideoName('');
                    }}
                    className="text-neutral-400 hover:text-fuchsia-400 ml-0.5 transition-colors cursor-pointer"
                    title="Remove video"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Attached 12s Audio Preview Pill */}
              {attachedAudio && (
                <div className="flex items-center gap-1.5 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-400/60 text-[11px] text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0">
                  <button
                    type="button"
                    onClick={toggleAudioPreview}
                    className="hover:text-white transition-colors cursor-pointer"
                    title={isAudioPreviewPlaying ? 'ভয়েস থামান' : `${audioDuration} সেকেন্ড ভয়েস শুনুন`}
                  >
                    {isAudioPreviewPlaying ? (
                      <Pause className="h-3 w-3 text-cyan-400" />
                    ) : (
                      <Play className="h-3 w-3 text-cyan-400 ml-0.5" />
                    )}
                  </button>
                  <span className="font-mono truncate max-w-[110px] sm:max-w-[160px]">
                    {attachedAudioName}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-900/80 border border-cyan-400/40 font-mono text-cyan-300">
                    {audioDuration}s
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedAudio(null);
                      if (audioPreviewRef.current) {
                        audioPreviewRef.current.pause();
                        setIsAudioPreviewPlaying(false);
                      }
                    }}
                    className="text-neutral-400 hover:text-fuchsia-400 ml-0.5 transition-colors cursor-pointer"
                    title="Remove audio"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Voice Recorder Mic Button (Top-Right on the same row) */}
            <button
              type="button"
              onClick={isRecording ? stopLiveRecording : startLiveRecording}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-fuchsia-600 text-white animate-pulse shadow-[0_0_22px_rgba(255,0,128,0.7)] border border-fuchsia-400'
                  : 'text-cyan-400 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Record Voice'}
            >
              {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4.5 w-4.5" />}
            </button>
          </div>

          <textarea
            ref={textareaRef}
            rows={4}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder=""
            className="w-full min-h-[80px] sm:min-h-[96px] bg-transparent text-sm sm:text-base text-slate-100 placeholder-transparent focus:outline-none resize-none font-sans leading-relaxed pt-1"
          />

          {/* Prompt Stats & Estimated Cost Bar */}
          <div className="flex items-center gap-2 font-mono select-none tracking-wider uppercase text-[8px] sm:text-[9px] px-1 pb-1">
            <span className="text-cyan-400/90 font-medium">
              Characters: {inputPrompt.length}
            </span>
            <span className="text-fuchsia-500/60 font-bold">|</span>
            <span className="text-cyan-300/90 font-medium">
              Est. Video: ~{audioDuration}s
            </span>
            <span className="text-fuchsia-500/60 font-bold">|</span>
            <span className="text-cyan-400/90 font-medium">
              Estimated Cost: {estimatedCreditCost.toFixed(2)} Credits
            </span>
          </div>

          {/* Bottom Action Row: (+) Icon on Left, Resolution & Send Button on Right */}
          <div className="flex items-center justify-between pt-1">
            {/* Left: (+) Attach Button & 768p Resolution Tag */}
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`h-9 w-9 rounded-full bg-[#161c28] hover:bg-[#1e2538] text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center transition-all shadow-[0_0_12px_rgba(0,240,255,0.15)] cursor-pointer ${
                  isMenuOpen ? 'rotate-45 border-cyan-400 text-white' : ''
                }`}
                title="Add Media"
              >
                <Plus className="h-5 w-5 transition-transform duration-200" />
              </button>
              {/* Popover Menu: Add Image, Add Video with ?, Add Audio */}
              {isMenuOpen && (
                <>
                  {/* Backdrop to close menu when clicking outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />

                  <div className="absolute bottom-11 left-0 z-50 w-48 bg-[#0a0d14] border border-cyan-500/50 rounded-xl p-1.5 shadow-[0_0_25px_rgba(0,240,255,0.3)] space-y-1 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-semibold text-left transition-colors cursor-pointer"
                    >
                      <ImageIcon className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span>Add Image</span>
                    </button>

                    {/* Add Video Option with (?) Help Icon */}
                    <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => {
                          videoInputRef.current?.click();
                          setIsMenuOpen(false);
                        }}
                        className="flex-1 flex items-center gap-2.5 text-left"
                      >
                        <Film className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span>Add Video (Optional)</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsVideoHelpOpen(true);
                          setIsMenuOpen(false);
                        }}
                        className="h-5 w-5 rounded-full bg-cyan-950 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-900 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-1"
                        title="ভিডিও নির্দেশিকা দেখুন (?)"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        audioInputRef.current?.click();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-semibold text-left transition-colors cursor-pointer"
                    >
                      <Volume2 className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span>Add Audio</span>
                    </button>
                  </div>
                </>
              )}

              {/* Minimal 768p Resolution Tag */}
              <button
                type="button"
                onClick={() => setResolution(resolution === '768p' ? '1080p' : '768p')}
                className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full border border-cyan-500/50 bg-cyan-950/60 text-cyan-300 hover:border-cyan-400 transition-all shadow-[0_0_10px_rgba(0,240,255,0.15)] cursor-pointer"
                title="Change resolution"
              >
                {resolution}
              </button>
            </div>

            {/* Right: Send / Generate Button */}
            <div className="flex flex-col items-center gap-2">
              {/* Send / Generate Button (Vibrant Neon Cyan with black arrow) */}
              <button
                type="button"
                onClick={handleSend}
                disabled={isGenerating || (!attachedImage && !attachedVideo && !inputPrompt)}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isGenerating
                    ? 'bg-cyan-800/50 cursor-not-allowed text-black/50 border border-cyan-500/30'
                    : 'bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-bold shadow-[0_0_22px_rgba(0,240,255,0.55)] active:scale-95'
                }`}
                title="Generate video"
              >
                {isGenerating ? (
                  <Square className="h-4 w-4 fill-black text-black" />
                ) : (
                  <ArrowUp className="h-5 w-5 stroke-[2.8]" />
                )}
              </button>
          </div>
          </div>
        </div>
      </section>

      {/* 3. EXACT 200 PIXEL SPACE (WITH SLEEK CYBER-GLOW DIVIDER) */}
      <div
        className="w-full shrink-0 flex items-center justify-center pointer-events-none"
        style={{ height: '200px' }}
        aria-hidden="true"
      >
        <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 via-fuchsia-500 to-transparent shadow-[0_0_12px_rgba(0,240,255,0.4)]" />
      </div>

        {/* 4. 9:16 PORTRAIT VIDEO PLAYER (PLACED BELOW 200PX SPACE AT THE BOTTOM) */}
        <div
          ref={videoSectionRef}
          className="w-full flex flex-col items-center justify-center pb-24"
        >
          {/* 4 CARDS (2x2 GRID): ADD YOUR IMAGE + 3 DEFAULT PRESENTERS (TV Presenter, Keynote Speaker, Tech Reviewer) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-[340px] sm:max-w-[380px] mx-auto">
            {/* 1. "অ্যাড ইমেজ" SLOT: IF RECENT CUSTOM IMAGE EXISTS, DISPLAY IT WITH FLOATING "চেঞ্জ ইমেজ" & "৯:১৬" RATIO ONLY */}
            {recentCustomImage ? (
              <div
                onClick={() => {
                  if (selectedPresetId !== 'custom') {
                    setSelectedPresetId('custom');
                    setAttachedImage(recentCustomImage);
                    setAttachedImageName('কাস্টম ছবি');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className={`relative group rounded-2xl overflow-hidden aspect-[3/4.2] flex flex-col transition-all duration-200 cursor-pointer ${
                  selectedPresetId === 'custom'
                    ? 'border-2 border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_24px_rgba(0,240,255,0.4)] scale-[1.02]'
                    : 'border border-cyan-900/40 bg-[#080d18] opacity-85 hover:opacity-100 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                }`}
                title="চেঞ্জ ইমেজ"
              >
                {/* Saved Recent Custom Image */}
                <img
                  src={recentCustomImage}
                  alt="Recent Custom"
                  className="w-full flex-1 object-cover object-top"
                />

                {/* Top-Right Active Checkmark Badge when selected */}
                {selectedPresetId === 'custom' && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.8)] z-10">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Bottom Bar: চেঞ্জ ইমেজ (Moved to bottom, aspect ratio deleted) */}
                <div className="w-full py-2 px-1.5 bg-[#070b14] border-t border-cyan-900/40 text-center shrink-0 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-[11px] font-semibold text-cyan-300 hover:text-white uppercase tracking-wide transition-colors cursor-pointer"
                  >
                    চেঞ্জ ইমেজ
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`relative group rounded-2xl overflow-hidden aspect-[3/4.2] flex flex-col items-center justify-center p-3 text-center transition-all duration-200 cursor-pointer ${
                  selectedPresetId === 'custom'
                    ? 'border-2 border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_24px_rgba(0,240,255,0.4)] bg-[#070b14]'
                    : 'border-2 border-dashed border-cyan-700/50 hover:border-cyan-400/80 bg-[#070b14]/70 hover:bg-[#0b1220] shadow-[0_0_15px_rgba(0,240,255,0.08)]'
                }`}
                title="Add Image"
              >
                <div className="flex flex-col items-center justify-center my-auto">
                  <div className="w-12 h-12 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 flex items-center justify-center mb-2 shadow-[0_0_14px_rgba(0,240,255,0.2)] group-hover:scale-105 transition-transform">
                    <Upload className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white/95">
                    অ্যাড ইমেজ
                  </span>
                  <span className="text-[11px] text-cyan-400 font-medium mt-2 group-hover:underline">
                    ছবি আপলোড করতে ক্লিক করুন
                  </span>
                </div>
              </button>
            )}

            {/* 2, 3, 4: THE THREE DEFAULT PRESENTER CARDS */}
            {PRESET_PRESENTERS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.title}
                  className={`relative group rounded-2xl overflow-hidden aspect-[3/4.2] flex flex-col transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_24px_rgba(0,240,255,0.4)] scale-[1.02]'
                      : 'border border-cyan-900/40 bg-[#080d18] opacity-80 hover:opacity-100 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                  }`}
                >
                  {/* Clean presenter photo - NO FLOATING TEXT OVER PHOTO */}
                  <img
                    src={preset.imagePath}
                    alt={preset.title}
                    className="w-full flex-1 object-cover object-top"
                  />

                  {/* Top-Right Active Checkmark Badge when selected */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Clean bottom bar with subtle small English title only */}
                  <div className="w-full py-2 px-1.5 bg-[#070b14] border-t border-cyan-900/40 text-center shrink-0">
                    <span className="text-[11px] font-medium text-cyan-200/90 tracking-wide uppercase">
                      {preset.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* EXACT 50 PIXEL SPACE BETWEEN PRESENTER SELECTOR AND VIDEO PLAYER */}
          <div
            className="w-full shrink-0 pointer-events-none"
            style={{ height: '50px' }}
            aria-hidden="true"
          />

          {/* 9:16 PORTRAIT PLAYER CONTAINER (SHARP RECTANGULAR - NO ROUNDED CORNERS) */}
          <div className="relative w-full max-w-[270px] sm:max-w-[300px] aspect-[9/16] rounded-none overflow-hidden border border-cyan-500/40 bg-[#07090f] shadow-[0_0_35px_rgba(0,240,255,0.2)] flex flex-col items-center justify-center">
            {/* VIDEO PLAYER DISPLAY: TEMPLATE (IMAGE + AUDIO) OR GENERATED VIDEO */}
            <div className="relative w-full h-full bg-black flex items-center justify-center group overflow-hidden">
              {currentVideoUrl ? (
                <video
                  ref={portraitVideoRef}
                  src={currentVideoUrl}
                  poster={attachedImage || PRESET_PRESENTERS[0].imagePath}
                  playsInline
                  loop
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onError={() => {
                    console.warn('Video element error');
                    setIsVideoPlaying(false);
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={attachedImage || PRESET_PRESENTERS[0].imagePath}
                  alt={attachedImageName || 'Presenter Portrait'}
                  className="w-full h-full object-cover"
                />
              )}

              {/* During active generation before video arrives, subtle unobtrusive overlay */}
              {isGenerating && !currentVideoUrl && (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                  <span className="text-xs font-semibold text-cyan-300 bg-cyan-950/90 px-3 py-1.5 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                    ভিডিও তৈরি হচ্ছে...
                  </span>
                  <span className="text-[10px] text-fuchsia-300 font-mono mt-1.5 drop-shadow">
                    উপরের বক্সে লাইভ স্ট্যাটাস দেখুন ☝️
                  </span>
                </div>
              )}

              {/* Center Play/Pause Button - ONLY this button remains on the video player */}
              {(!isGenerating || currentVideoUrl) && (
                <button
                  type="button"
                  onClick={toggleVideoPlayback}
                  className={`absolute inset-0 m-auto h-14 w-14 rounded-full bg-black/70 backdrop-blur-md border border-cyan-400/60 text-cyan-300 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 hover:border-fuchsia-400 hover:text-fuchsia-300 hover:shadow-[0_0_25px_rgba(255,0,128,0.5)] active:scale-95 cursor-pointer ${
                    (isVideoPlaying || isAudioPreviewPlaying) ? 'opacity-0 group-hover:opacity-90' : 'opacity-100'
                  }`}
                  title={
                    currentVideoUrl
                      ? (isVideoPlaying ? 'Pause Video' : 'Play Video')
                      : (isAudioPreviewPlaying ? 'ভয়েস থামান' : `${audioDuration} সেকেন্ড ভয়েস শুনুন`)
                  }
                >
                  {(isVideoPlaying || isAudioPreviewPlaying) ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Direct In-Site Download Button below player when video is generated */}
          {currentVideoUrl && !isGenerating && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleDownloadVideo}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-cyan-950/80 text-cyan-300 hover:text-cyan-200 text-xs font-semibold border border-cyan-500/60 hover:border-cyan-400 transition-all shadow-[0_0_18px_rgba(0,240,255,0.35)] hover:shadow-[0_0_25px_rgba(0,240,255,0.55)] cursor-pointer disabled:opacity-60"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-cyan-400" />
                    <span>Download Video</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
      )}

      {/* API Key Modal */}
      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        isConfigured={isConfigured}
        keyPrefix={keyPrefix}
        onRefreshStatus={checkConfigStatus}
      />

      {/* Google Authentication Modal */}
      {isAuthModalOpen && (
        <AuthScreen
          isModal={true}
          onSignIn={handleSignIn}
          onCancel={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Video Reference Help & Guidelines Modal */}
      <VideoHelpModal
        isOpen={isVideoHelpOpen}
        onClose={() => setIsVideoHelpOpen(false)}
      />
    </div>
  );
}
