import React, { useState, useRef, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, subscribeUserClonedVoices, checkUserV2Limit, incrementUserV2Limit, checkUserV3Limit, incrementUserV3Limit, deductUserCredits, getPricingSettings, saveGenerationHistory } from './lib/firebase';
import { CharacterId, VoiceGenerationResponse, EngineMode, CHARACTERS } from './types';
import { Header } from './components/Header';
import { AudioPlayer } from './components/AudioPlayer';
import { HistoryModal } from './components/HistoryModal';
import { SubtitleGuideModal } from './components/SubtitleGuideModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { VoiceCloningModal, ClonedVoiceItem } from './components/VoiceCloningModal';
import { GoogleAuthModal, GoogleUser } from './components/GoogleAuthModal';
import { CreditsModal } from './components/CreditsModal';
import { convertNumbersAndDatesToBanglaWords } from './utils/banglaNumberDateConverter';
import {
  HistoryVoiceItem,
  HistoryVideoItem,
  getAllVoicesFromDevice,
  saveVoiceToDevice,
  deleteVoiceFromDevice,
  clearAllVoicesFromDevice,
  getAllVideosFromDevice,
  deleteVideoFromDevice,
  clearAllVideosFromDevice,
} from './services/historyStorage';
import { Loader2, Zap, Plus } from 'lucide-react';
import { PlayvearIcon } from './components/PlayvearIcon';
import VideoGeneratorScreen from './video-generator/App';

export default function App() {
  // Main Tab Navigation: Step 1 (Voice Generator) vs Step 2 (Video Generator)
  const [activeMainTab, setActiveMainTab] = useState<'step1_voice' | 'step2_video'>('step1_voice');

  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('news_anchor');
  const [script, setScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Multi-Engine Selection:
  // - Model V2 (v2): Gemini TTS Built-in standard voices (free)
  // - Model V3 (v3): Cartesia AI Sonic Free Rotator Pool (8 keys, free)
  // - Model V4 (v4): Cartesia Paid Subscription & Dedicated Voice Cloning Engine (exclusive to paid key)
  const [engineMode, setEngineMode] = useState<EngineMode>('v2');
  const [cartesiaApiKey, setCartesiaApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('playvear_cartesia_api_key') || '';
    } catch {
      return '';
    }
  });
  const [cartesiaPaidApiKey, setCartesiaPaidApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('playvear_cartesia_paid_api_key') || '';
    } catch {
      return '';
    }
  });
  const [hasPaidKey, setHasPaidKey] = useState<boolean>(false);
  const [showCartesiaKeyModal, setShowCartesiaKeyModal] = useState<boolean>(false);

  // Model V3 free voices state (Strictly populated from active Cartesia key)
  const [v3Voices, setV3Voices] = useState<ClonedVoiceItem[]>([]);

  // Model V4 Paid Cloned Voices state (Strictly populated from Paid key)
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceItem[]>([]);

  const [selectedClonedVoiceId, setSelectedClonedVoiceId] = useState<string | null>(null);

  // Dropdown open states for Step 1 character/voice selection
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState<boolean>(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);

  // Voice cloning modal state (Active exclusively on Model V4)
  const [showVoiceCloneModal, setShowVoiceCloneModal] = useState<boolean>(false);

  // Google Authentication State
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem('playvear_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState<boolean>(false);
  const authIntentRef = useRef<'voice_clone' | 'general' | null>(null);
  const [userCredit, setUserCredit] = useState<number>(0.00);
  const [showCreditsModal, setShowCreditsModal] = useState<boolean>(false);

  // Real-time Firestore Credit Sync
  useEffect(() => {
    if (!googleUser?.uid) {
      setUserCredit(0.00);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', googleUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (typeof data.credits === 'number') {
          setUserCredit(data.credits);
        } else if (typeof data.credit === 'number') {
          // Fallback for old field name if any
          setUserCredit(data.credit);
        }
      }
    });

    return () => unsubscribe();
  }, [googleUser?.uid]);

  // Real-time Firestore Sync for Authenticated User's Private Cloned Voices (Model V4)
  // Ensures User A ONLY sees their own voices, and never anyone else's!
  useEffect(() => {
    if (!googleUser?.uid) {
      setClonedVoices([]);
      return;
    }

    // Try loading immediate cached user voices for fast offline/instant display
    try {
      const userCachedKey = `playvear_v4_voices_${googleUser.uid}`;
      const cached = localStorage.getItem(userCachedKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClonedVoices(parsed);
          setSelectedClonedVoiceId((prev) => (prev ? prev : parsed[0].id));
        }
      }
    } catch {}

    const unsubscribe = subscribeUserClonedVoices(googleUser.uid, (userVoiceRecords) => {
      const userItems: ClonedVoiceItem[] = userVoiceRecords.map((v) => ({
        id: v.id,
        name: v.name.replace(/^[💎\s]+/, '').trim() || 'Cloned Voice',
        description: v.description || 'Personal V4 Cloned Character',
        category: v.category || 'news_anchor',
        speed: '1.0x',
        emotion: 'neutral',
        createdAt: v.createdAt ? new Date(v.createdAt).toLocaleDateString('bn-BD') : 'Cloned',
        isCloned: true,
        isPaidCloned: true,
        isV4: true,
      }));

      setClonedVoices(userItems);

      try {
        localStorage.setItem(`playvear_v4_voices_${googleUser.uid}`, JSON.stringify(userItems));
      } catch {}

      // Synchronize selection with user's personal voices
      if (userItems.length > 0) {
        setSelectedClonedVoiceId((prevId) => {
          const exists = userItems.some((v) => v.id === prevId);
          return exists ? prevId : userItems[0].id;
        });
      } else {
        setSelectedClonedVoiceId(null);
      }
    });

    return () => unsubscribe();
  }, [googleUser?.uid]);

  // Dynamic Key Rotator & Voice Synchronization State
  const [activeKeyInfo, setActiveKeyInfo] = useState<{
    index: number;
    label: string;
    charsUsed: number;
    maxLimit: number;
  }>({
    index: 1,
    label: 'Key #1',
    charsUsed: 0,
    maxLimit: 19500,
  });
  const [availableKeys, setAvailableKeys] = useState<{ index: number; label: string; customVoicesCount?: number }[]>([]);
  const [keyRotationToast, setKeyRotationToast] = useState<string | null>(null);

  // Load and synchronize Cartesia voices for Model V3 (free pool) and Model V4 (paid status)
  const loadCartesiaVoices = async (keyIndex?: number, targetMode?: EngineMode) => {
    const currentMode = targetMode || engineMode;
    try {
      // 1. Fetch Model V3 voices (Strictly from the active key in Cartesia)
      const v3Url = typeof keyIndex === 'number' ? `/api/cartesia-voices?keyIndex=${keyIndex}` : '/api/cartesia-voices';
      const res3 = await fetch(v3Url);
      if (res3.ok) {
        const data3 = await res3.json();
        const incomingV3Voices: ClonedVoiceItem[] = Array.isArray(data3.voices) ? data3.voices : [];

        if (Array.isArray(data3.availableKeys)) {
          setAvailableKeys(data3.availableKeys);
        }

        // Smart initial active key selection: If current key has 0 voices, silently load first key with voices
        if (incomingV3Voices.length === 0 && Array.isArray(data3.availableKeys) && typeof keyIndex === 'undefined') {
          const keyWithVoices = data3.availableKeys.find((k: any) => k && k.customVoicesCount > 0);
          if (keyWithVoices?.index) {
            loadCartesiaVoices(keyWithVoices.index, currentMode);
            return;
          }
        }

        setV3Voices(incomingV3Voices);

        // Synchronize selected voice for V3
        if (currentMode === 'v3') {
          if (incomingV3Voices.length > 0) {
            setSelectedClonedVoiceId((prevId) => {
              const exists = incomingV3Voices.some((v) => v.id === prevId);
              return exists ? prevId : incomingV3Voices[0].id;
            });
          } else {
            setSelectedClonedVoiceId(null);
          }
        }

        if (data3.activeKeyIndex) {
          setActiveKeyInfo({
            index: data3.activeKeyIndex,
            label: data3.activeKeyLabel || `Key #${data3.activeKeyIndex}`,
            charsUsed: data3.charCountUsed || 0,
            maxLimit: data3.maxCharsLimit || 19500,
          });
        }
        if (data3.hasPaidKey !== undefined) {
          setHasPaidKey(Boolean(data3.hasPaidKey));
        }
      }

      // 2. Fetch Model V4 Paid Key availability status
      const res4 = await fetch('/api/cartesia-voices?model=v4');
      if (res4.ok) {
        const data4 = await res4.json();
        if (data4.hasPaidKey !== undefined) {
          setHasPaidKey((prev) => prev || Boolean(data4.hasPaidKey));
        }
      }
    } catch (err) {
      console.warn('Error loading Cartesia voices:', err);
    }
  };

  // Sync Cartesia voices on initial mount and whenever engineMode changes
  useEffect(() => {
    loadCartesiaVoices(undefined, engineMode);
  }, [engineMode]);

  // History modal state (Voice & Video)
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<HistoryVoiceItem[]>([]);
  const [videoHistoryItems, setVideoHistoryItems] = useState<HistoryVideoItem[]>([]);

  const loadVideoHistory = () => {
    getAllVideosFromDevice()
      .then((items) => setVideoHistoryItems(items))
      .catch((err) => console.warn('Error loading video history from device storage:', err));
  };

  useEffect(() => {
    loadVideoHistory();
    const handleVideoSaved = () => loadVideoHistory();
    window.addEventListener('video-saved-to-history', handleVideoSaved);
    return () => window.removeEventListener('video-saved-to-history', handleVideoSaved);
  }, []);

  // Subtitle usage guide modal state
  const [isSubtitleGuideOpen, setIsSubtitleGuideOpen] = useState<boolean>(false);

  // Double tap exit toast indicator
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  const prevAudioUrlRef = useRef<string | null>(null);
  const lastBackPressTimeRef = useRef<number>(0);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent browser pull-to-refresh on mobile swipe down
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // If swiping downwards at the top of page or scroll container
        if (deltaY > 0 && window.scrollY <= 0) {
          // Check if target is a scrollable container that is scrolled down
          let el = e.target as HTMLElement | null;
          let canScrollUp = false;
          while (el && el !== document.body && el !== document.documentElement) {
            if (el.scrollTop > 0) {
              canScrollUp = true;
              break;
            }
            el = el.parentElement;
          }

          if (!canScrollUp) {
            // Prevent browser default pull-to-refresh
            if (e.cancelable) {
              e.preventDefault();
            }
          }
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Load persistent history items from IndexedDB
  useEffect(() => {
    let mounted = true;
    getAllVoicesFromDevice()
      .then((items: HistoryVoiceItem[]) => {
        if (mounted) setHistoryItems(items);
      })
      .catch((err: unknown) => console.error('Error loading history from device storage:', err));
    return () => {
      mounted = false;
    };
  }, []);

  // Keep refs up to date so popstate listener never uses stale closures
  const isHistoryOpenRef = useRef<boolean>(isHistoryOpen);
  const isSubtitleGuideOpenRef = useRef<boolean>(isSubtitleGuideOpen);

  useEffect(() => {
    isHistoryOpenRef.current = isHistoryOpen;
  }, [isHistoryOpen]);

  useEffect(() => {
    isSubtitleGuideOpenRef.current = isSubtitleGuideOpen;
  }, [isSubtitleGuideOpen]);

  // Sync browser/mobile history state for hardware back button interception
  useEffect(() => {
    // Push an initial state so back button can be intercepted
    window.history.replaceState({ appState: 'root' }, '');
    window.history.pushState({ appState: 'active' }, '');

    const handlePopState = () => {
      // Step 1: Check if any UI modals/menus/popups are open
      const isConfirmModalOpen = !!document.getElementById('clear-all-confirmation-modal');
      const isDropdownOpen = !!document.getElementById('character-dropdown-menu');
      const isMenuOpen = !!document.getElementById('header-options-dropdown');

      if (isConfirmModalOpen) {
        // Close clear confirm modal
        window.dispatchEvent(new CustomEvent('close-clear-confirm-modal'));
        window.history.pushState({ appState: 'active' }, '');
        return;
      }

      if (isSubtitleGuideOpenRef.current) {
        // Close subtitle guide modal
        setIsSubtitleGuideOpen(false);
        window.history.pushState({ appState: 'active' }, '');
        return;
      }

      if (isHistoryOpenRef.current) {
        // Close history modal
        setIsHistoryOpen(false);
        window.history.pushState({ appState: 'active' }, '');
        return;
      }

      if (isDropdownOpen || isMenuOpen) {
        // Close open dropdowns/menus
        window.dispatchEvent(new CustomEvent('close-all-header-menus'));
        window.history.pushState({ appState: 'active' }, '');
        return;
      }

      // Step 2: At root screen - handle double-tap to exit
      const now = Date.now();
      const timeDiff = now - lastBackPressTimeRef.current;

      if (timeDiff < 2000) {
        // Double tap confirmed! Allow exit
        if (exitToastTimerRef.current) {
          clearTimeout(exitToastTimerRef.current);
        }
        setShowExitToast(false);
        // Allow actual back navigation / exit
        window.history.back();
      } else {
        // First tap: Intercept back, re-push state, and show toast
        lastBackPressTimeRef.current = now;
        window.history.pushState({ appState: 'active' }, '');

        setShowExitToast(true);
        if (exitToastTimerRef.current) {
          clearTimeout(exitToastTimerRef.current);
        }
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);

    const handleOpenCredits = () => {
      setShowCreditsModal(true);
    };
    window.addEventListener('open-credits-modal', handleOpenCredits);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('open-credits-modal', handleOpenCredits);
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
      }
    };
  }, []);

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

  const estimatedCreditCost = engineMode === 'v4' 
    ? (script.length / 1000) * (pricingSettings.v4CharRate || 7.2)
    : 0;

  const handleGenerate = async () => {
    if (!script.trim()) {
      setErrorMessage('Please enter or paste your script text.');
      return;
    }

    // Automatically convert numeric digits, dates, currencies into natural Bengali spoken words
    const normalizedScript = convertNumbersAndDatesToBanglaWords(script.trim());
    if (normalizedScript !== script.trim()) {
      setScript(normalizedScript);
    }

    const maxCharsAllowed = engineMode === 'v3' ? 1000 : engineMode === 'v4' ? 5000 : 2500;
    if (script.trim().length > maxCharsAllowed) {
      setErrorMessage('Too long text');
      return;
    }
    if (engineMode === 'v2') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check 1: Device LocalStorage check
        const storageKey = `playvear_v2_usage_${todayStr}`;
        const countStr = localStorage.getItem(storageKey) || '0';
        const currentCount = parseInt(countStr, 10);

        if (currentCount >= 5) {
          setErrorMessage('Daily limit exceeded');
          return;
        }

        // Check 2: Google Account / Firebase UID check (if signed in)
        if (googleUser?.uid) {
          const isAccountExceeded = await checkUserV2Limit(googleUser.uid);
          if (isAccountExceeded) {
            setErrorMessage('Daily limit exceeded');
            return;
          }
        }
      } catch (e) {
        console.warn('V2 daily limit check warning:', e);
      }
    }

    // Model V3 Daily Limit Check (Max 1 generation per day)
    if (engineMode === 'v3') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check 1: Device LocalStorage check
        const storageKey = `playvear_v3_usage_${todayStr}`;
        const countStr = localStorage.getItem(storageKey) || '0';
        const currentCount = parseInt(countStr, 10);

        if (currentCount >= 1) {
          setErrorMessage('Daily generation limit reached.');
          return;
        }

        // Check 2: Google Account / Firebase UID check (if signed in)
        if (googleUser?.uid) {
          const isAccountExceeded = await checkUserV3Limit(googleUser.uid);
          if (isAccountExceeded) {
            setErrorMessage('Daily limit exceeded');
            return;
          }
        }
      } catch (e) {
        console.warn('V3 daily limit check warning:', e);
      }
    }

    // In Model V4 (Paid Voice Cloning), ensure user has provided Paid Key
    if (engineMode === 'v4') {
      const hasKey = Boolean(cartesiaPaidApiKey) || hasPaidKey;
      if (!hasKey) {
        setErrorMessage('Model V4 requires a Cartesia Paid API Key (CARTESIA_PAID_API_KEY). Please input your paid key.');
        setShowCartesiaKeyModal(true);
        return;
      }

      // V4 Credit Check
      const requiredCredits = estimatedCreditCost;

      if (userCredit < requiredCredits) {
        setErrorMessage(`You don't have enough credits. This voice requires about ${requiredCredits.toFixed(2)} credits. Current balance: ${userCredit.toFixed(2)} credits.`);
        setShowCreditsModal(true);
        return;
      }
    }

    setErrorMessage(null);
    setIsGenerating(true);

    const isCartesiaEngine = engineMode === 'v3' || engineMode === 'v4';

    // Strict Commercial Guard: Halt if no cloned character exists on this active key
    if (isCartesiaEngine) {
      const activeVoiceList = engineMode === 'v4' ? clonedVoices : v3Voices;
      const targetVoice = activeVoiceList.find((v) => v.id === selectedClonedVoiceId) || activeVoiceList[0];
      if (!targetVoice || !targetVoice.id) {
        setErrorMessage(
          engineMode === 'v4'
            ? 'You do not have any cloned characters in Model V4. Please clone your own voice first.'
            : `No preset characters found in current API Key (#${activeKeyInfo.index}). Please select another Key (e.g., Key #2) from Admin Panel.`
        );
        setIsGenerating(false);
        return;
      }
    }

    // Get active voice details
    const activeClonedVoice = isCartesiaEngine
      ? (engineMode === 'v4' ? clonedVoices : v3Voices).find((v) => v.id === selectedClonedVoiceId) ||
        (engineMode === 'v4' ? clonedVoices[0] : v3Voices[0])
      : null;

    const activeVoiceName = activeClonedVoice?.name
      ? activeClonedVoice.name.replace(/^[💎\s]+/, '').split(' - ')[0].trim()
      : '';

    try {
      const endpoint = isCartesiaEngine ? '/api/cartesia-generate' : '/api/generate-voice';
      const bodyPayload = isCartesiaEngine
        ? {
            text: normalizedScript,
            character: engineMode === 'v4' && activeClonedVoice?.category ? activeClonedVoice.category : selectedCharacter,
            apiKey: cartesiaApiKey,
            voiceId: activeClonedVoice?.id || '',
            voiceName: activeVoiceName,
            emotion:
              activeClonedVoice?.emotion && activeClonedVoice.emotion !== 'neutral'
                ? activeClonedVoice.emotion
                : undefined,
            speed:
              activeClonedVoice?.speed && activeClonedVoice.speed !== '1.0x'
                ? activeClonedVoice.speed
                : undefined,
            isV4: engineMode === 'v4',
            paidApiKey: cartesiaPaidApiKey,
          }
        : {
            text: normalizedScript,
            character: selectedCharacter,
            voiceName: CHARACTERS.find((c) => c.id === selectedCharacter)?.name || selectedCharacter,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        throw new Error('Could not get valid audio data from server. Please try again.');
      }

      if (!response.ok || data?.error) {
        if (data?.isPaidKeyMissing || data?.isApiKeyMissing) {
          setShowCartesiaKeyModal(true);
        }
        throw new Error(data?.error || 'Failed to generate voice. Please try again.');
      }

      if (!data?.audioBase64) {
        throw new Error('Audio data not found. Please try again.');
      }

      // Model V4: Deduct credits on success
      if (engineMode === 'v4' && googleUser?.uid) {
        try {
          const cost = (normalizedScript.length / 1000) * (pricingSettings.v4CharRate || 7.2);
          await deductUserCredits(googleUser.uid, cost);
        } catch (e) {
          console.warn('Credit deduction error:', e);
        }
      }

      // If Model V2 succeeded, increment daily device and user account usage count
      if (engineMode === 'v2') {
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const storageKey = `playvear_v2_usage_${todayStr}`;
          const countStr = localStorage.getItem(storageKey) || '0';
          const newCount = parseInt(countStr, 10) + 1;
          localStorage.setItem(storageKey, String(newCount));

          if (googleUser?.uid) {
            await incrementUserV2Limit(googleUser.uid);
          }
        } catch (e) {
          console.warn('V2 usage increment warning:', e);
        }
      }

      // If Model V3 succeeded, increment daily device and user account usage count
      if (engineMode === 'v3') {
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const storageKey = `playvear_v3_usage_${todayStr}`;
          const countStr = localStorage.getItem(storageKey) || '0';
          const newCount = parseInt(countStr, 10) + 1;
          localStorage.setItem(storageKey, String(newCount));

          if (googleUser?.uid) {
            await incrementUserV3Limit(googleUser.uid);
          }
        } catch (e) {
          console.warn('V3 usage increment warning:', e);
        }
      }

      // Convert base64 to Blob URL
      const byteCharacters = atob(data.audioBase64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      
      // Accurately verify audio format from magic bytes for robust cross-browser playback
      const isMp3 = byteArray.length > 2 && byteArray[0] === 0xff && (byteArray[1] & 0xe0) === 0xe0;
      const resolvedMime = isMp3 ? 'audio/mpeg' : (data.mimeType || 'audio/wav');
      const blob = new Blob([byteArray], { type: resolvedMime });

      const newUrl = URL.createObjectURL(blob);
      const oldUrl = prevAudioUrlRef.current;
      prevAudioUrlRef.current = newUrl;
      setAudioUrl(newUrl);

      // Gracefully revoke previous blob URL after component has re-rendered with new audio
      if (oldUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(oldUrl);
          } catch {
            // Ignore
          }
        }, 3000);
      }

      // Check if Cartesia rotator auto-rotated because key reached 19,500 characters
      if (data?.rotatedToNewKey) {
        const toastMsg = `Key #${data.prevKeyIndex || activeKeyInfo.index} quota reached 19,500 characters! Automatically switched to Key #${data.newKeyIndex}.`;
        setKeyRotationToast(toastMsg);
        setTimeout(() => setKeyRotationToast(null), 8000);
        await loadCartesiaVoices(data.newKeyIndex);
      } else if (data?.activeKeyIndex) {
        setActiveKeyInfo((prev) => ({
          ...prev,
          index: data.activeKeyIndex,
          charsUsed: typeof data.keyCharUsage === 'number' ? data.keyCharUsage : prev.charsUsed,
        }));
      }

      // Save to device local storage (IndexedDB persistent storage)
      saveVoiceToDevice({
        character: selectedCharacter,
        script: script.trim(),
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/wav',
        format: data.format || (isCartesiaEngine ? 'wav' : 'mp3'),
      })
        .then((savedItem) => {
          setHistoryItems((prev) => [savedItem, ...prev]);
        })
        .catch((err) => {
          console.warn('Could not save to local device storage:', err);
        });

      // Save to generation history for admin panel
      if (googleUser?.uid) {
        const charCount = normalizedScript.length;
        let cost = 0;
        let charge = 0;
        let profit = 0;

        if (engineMode === 'v4') {
          cost = (charCount / 1000) * 6.0;
          charge = (charCount / 1000) * (pricingSettings.v4CharRate || 7.2);
          profit = charge - cost;
        } else if (engineMode === 'v3') {
          // Internal cost estimate for free rotator pool if any
          cost = 0; 
          charge = 0;
          profit = 0;
        }

        saveGenerationHistory({
          id: 'voice_' + Date.now(),
          type: 'voice',
          model: engineMode.toUpperCase(),
          userId: googleUser.uid,
          userEmail: googleUser.email || '',
          chars: charCount,
          cost,
          charge,
          profit,
          isPaid: engineMode === 'v4',
          status: 'completed'
        });
      }

      // Increment Model V3 daily usage count
      if (engineMode === 'v3') {
        const todayStr = new Date().toISOString().split('T')[0];
        const storageKey = `playvear_v3_usage_${todayStr}`;
        const countStr = localStorage.getItem(storageKey) || '0';
        localStorage.setItem(storageKey, String(parseInt(countStr, 10) + 1));
        if (googleUser?.uid) {
          incrementUserV3Limit(googleUser.uid).catch(e => console.warn('V3 limit increment error:', e));
        }
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(err?.message || 'An error occurred while generating the voice.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${selectedCharacter}-voice.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleResetToNew = () => {
    if (prevAudioUrlRef.current) {
      URL.revokeObjectURL(prevAudioUrlRef.current);
      prevAudioUrlRef.current = null;
    }
    setAudioUrl(null);
    setScript('');
    setErrorMessage(null);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteVoiceFromDevice(id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllHistory = async () => {
    await clearAllVoicesFromDevice();
    setHistoryItems([]);
  };

  const handleDeleteVideoItem = async (id: string) => {
    await deleteVideoFromDevice(id);
    setVideoHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllVideos = async () => {
    await clearAllVideosFromDevice();
    setVideoHistoryItems([]);
  };

  const handleSelectHistoryScript = (historicScript: string) => {
    setScript(historicScript);
  };

  const activeCategoryObj = CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];
  const activeV3VoiceObj = v3Voices.find((v) => v.id === selectedClonedVoiceId) || v3Voices[0];
  const activeV4VoiceObj = clonedVoices.find((v) => v.id === selectedClonedVoiceId) || clonedVoices[0];

  return (
    <div
      id="app-root"
      className="min-h-screen bg-[#090b0e] text-stone-100 flex flex-col font-['Plus_Jakarta_Sans','Hind_Siliguri',sans-serif] selection:bg-cyan-500 selection:text-stone-950 relative"
    >
      {/* Top Header with Dynamic Character Dropdown & 3-Dots Menu (Shared across Step 1 & Step 2) */}
      <Header
        engineMode={engineMode}
        selectedCharacter={selectedCharacter}
        onSelectCharacter={(char) => {
          setSelectedCharacter(char);
          setErrorMessage(null);
        }}
        selectedClonedVoiceId={selectedClonedVoiceId}
        onSelectClonedVoiceId={(id) => {
          setSelectedClonedVoiceId(id);
          setErrorMessage(null);
        }}
        v3Voices={v3Voices}
        v4Voices={clonedVoices}
        googleUser={googleUser}
        onOpenGoogleAuth={() => {
          authIntentRef.current = 'general';
          setShowGoogleAuthModal(true);
        }}
        onOpenVoiceCloneModal={() => {
          if (!googleUser) {
            authIntentRef.current = 'voice_clone';
            setShowGoogleAuthModal(true);
          } else {
            setShowVoiceCloneModal(true);
          }
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSubtitleGuide={() => setIsSubtitleGuideOpen(true)}
        onOpenCartesiaRotator={() => setShowCartesiaKeyModal(true)}
        onOpenAdminPanel={() => setShowCartesiaKeyModal(true)}
        historyCount={historyItems.length + videoHistoryItems.length}
        activeKeyInfo={activeKeyInfo}
        hasPaidKey={hasPaidKey || Boolean(cartesiaPaidApiKey)}
        availableKeys={availableKeys}
        onSwitchKey={(keyIndex) => loadCartesiaVoices(keyIndex)}
        onLogout={() => {
          setGoogleUser(null);
          setClonedVoices([]);
          setSelectedClonedVoiceId(null);
          try {
            localStorage.removeItem('playvear_google_user');
          } catch {}
        }}
        userCredit={userCredit}
        showVoiceSelector={false}
      />

      {/* Step 1: Voice Generator View */}
      {activeMainTab === 'step1_voice' && (
        <main id="main-content" className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-6 pb-28 sm:pb-32 gap-5 relative z-10">
        {/* Model Engine Selector Switch (V2 vs V3 vs V4) - 80% Neon Cyan + 20% Neon Magenta Dark Theme */}
        <div id="model-engine-selector-bar" className="w-full flex items-center justify-between bg-[#0a0e18]/90 border border-cyan-500/30 rounded-2xl p-1 shadow-[0_0_20px_rgba(0,243,255,0.08)] backdrop-blur-md">
          <div className="grid grid-cols-3 gap-1.5 w-full">
            {/* V2 Button (Core Free Standard - Neon Cyan) */}
            <button
              id="engine-v2-tab-btn"
              type="button"
              onClick={() => {
                setEngineMode('v2');
                setErrorMessage(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                engineMode === 'v2'
                  ? 'bg-gradient-to-r from-cyan-950/90 via-[#0e1726] to-cyan-950/70 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(0,243,255,0.25)]'
                  : 'bg-transparent border-transparent text-stone-400 hover:text-cyan-200 hover:bg-cyan-950/20'
              }`}
            >
              {engineMode === 'v2' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff] animate-pulse" />
              )}
              <span>V2</span>
            </button>

            {/* V3 Button (Preset Voices - Cyan with Magenta Accent) */}
            <button
              id="engine-v3-tab-btn"
              type="button"
              onClick={() => {
                setEngineMode('v3');
                setErrorMessage(null);
                loadCartesiaVoices(undefined, 'v3');
              }}
              className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                engineMode === 'v3'
                  ? 'bg-gradient-to-r from-cyan-950/80 via-[#121226] to-fuchsia-950/70 text-cyan-200 border-cyan-400/50 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                  : 'bg-transparent border-transparent text-stone-400 hover:text-cyan-200 hover:bg-cyan-950/20'
              }`}
            >
              {engineMode === 'v3' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff] animate-pulse" />
              )}
              <span>V3</span>
            </button>

            {/* V4 Button (Paid Pro & Custom Clones - 20% Neon Magenta Accent) */}
            <button
              id="engine-v4-tab-btn"
              type="button"
              onClick={() => {
                setEngineMode('v4');
                setErrorMessage(null);
                loadCartesiaVoices(undefined, 'v4');
              }}
              className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                engineMode === 'v4'
                  ? 'bg-gradient-to-r from-cyan-950/50 via-[#180e28] to-fuchsia-950/90 text-fuchsia-200 border-fuchsia-500/60 shadow-[0_0_18px_rgba(255,0,234,0.3)]'
                  : 'bg-transparent border-transparent text-stone-400 hover:text-fuchsia-200 hover:bg-fuchsia-950/20'
              }`}
            >
              {engineMode === 'v4' && (
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#ff00ea] animate-pulse" />
              )}
              <span>V4</span>
            </button>
          </div>
        </div>

        {/* Output Category & Character Selector Bar */}
        <div id="character-category-selector-bar" className="w-full relative z-20">
          {engineMode === 'v4' ? (
            /* Model V4: Personal Cloned Voice Selection & Floating Plus Icon */
            <div className="relative w-full pt-1">
              {/* Floating Plus Icon - 20% Neon Magenta Accent */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!googleUser) {
                    authIntentRef.current = 'voice_clone';
                    setShowGoogleAuthModal(true);
                  } else {
                    setShowVoiceCloneModal(true);
                  }
                }}
                title="Open Voice Cloning"
                className="absolute -top-1.5 -right-1.5 z-30 w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 hover:from-fuchsia-500 hover:to-fuchsia-600 text-white border border-fuchsia-400/80 shadow-[0_0_12px_rgba(255,0,234,0.55)] flex items-center justify-center transition-all cursor-pointer active:scale-90"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (clonedVoices.length > 0) {
                    setIsVoiceDropdownOpen(!isVoiceDropdownOpen);
                  } else {
                    if (!googleUser) {
                      authIntentRef.current = 'voice_clone';
                      setShowGoogleAuthModal(true);
                    } else {
                      setShowVoiceCloneModal(true);
                    }
                  }
                  setIsCategoryDropdownOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold border bg-gradient-to-r from-[#0a0f1c] via-[#0d1424] to-[#140e22] border-cyan-500/40 hover:border-cyan-400 text-stone-100 shadow-[0_0_18px_rgba(0,243,255,0.08)] flex items-center justify-between gap-2 cursor-pointer transition-all text-left"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-400 shadow-[0_0_8px_#00f3ff] shrink-0" />
                  <span className="truncate font-semibold text-stone-100 text-xs sm:text-sm">
                    {clonedVoices.length > 0 && activeV4VoiceObj
                      ? activeV4VoiceObj.name.replace(/^[💎\s]+/, '').split(' - ')[0].trim()
                      : '+ Clone Your Own Voice'}
                  </span>
                </div>
                <svg className={`w-4 h-4 shrink-0 text-cyan-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isVoiceDropdownOpen && clonedVoices.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsVoiceDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-full bg-[#090d18]/98 border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(0,243,255,0.18)] z-50 p-2 max-h-64 overflow-y-auto flex flex-col gap-1 backdrop-blur-xl">
                    {clonedVoices.map((voice) => {
                      const isSelected = selectedClonedVoiceId === voice.id;
                      const cleanName = voice.name.replace(/^[💎\s]+/, '').split(' - ')[0].trim();
                      const categoryRole = CHARACTERS.find((c) => c.id === voice.category)?.role || voice.description || 'Model V4 Personal Character';
                      return (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => {
                            setSelectedClonedVoiceId(voice.id);
                            setIsVoiceDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer flex flex-col gap-0.5 border ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-fuchsia-500/15 border-cyan-400/70 text-cyan-200 font-bold'
                              : 'bg-[#0c121e] hover:bg-cyan-950/30 border-cyan-900/30 text-stone-300'
                          }`}
                        >
                          <span className="text-xs font-semibold truncate text-white">{cleanName}</span>
                          <span className="text-[10px] text-cyan-300/80 truncate font-normal">{categoryRole}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : engineMode === 'v3' ? (
            /* Model V3: Voice Preset Dropdown */
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  if (v3Voices.length > 0) {
                    setIsVoiceDropdownOpen(!isVoiceDropdownOpen);
                  }
                  setIsCategoryDropdownOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold border bg-gradient-to-r from-[#0a0f1c] via-[#0d1424] to-[#140e22] border-cyan-500/40 hover:border-cyan-400 text-stone-100 shadow-[0_0_18px_rgba(0,243,255,0.08)] flex items-center justify-between gap-2 cursor-pointer transition-all text-left"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-400 shadow-[0_0_8px_#00f3ff] shrink-0" />
                  <span className="truncate font-semibold text-stone-100 text-xs sm:text-sm">
                    {v3Voices.length > 0 && activeV3VoiceObj
                      ? activeV3VoiceObj.name.replace(/^[💎\s]+/, '').split(' - ')[0].trim()
                      : 'Select Voice Preset'}
                  </span>
                </div>
                <svg className={`w-4 h-4 shrink-0 text-cyan-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isVoiceDropdownOpen && v3Voices.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsVoiceDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-full bg-[#090d18]/98 border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(0,243,255,0.18)] z-50 p-2 max-h-64 overflow-y-auto flex flex-col gap-1 backdrop-blur-xl">
                    <div className="px-3 py-1 text-[11px] font-bold text-cyan-300 border-b border-cyan-900/40 flex items-center justify-between">
                      <span>Model V3 Presets</span>
                      <span className="text-[9px] font-mono text-fuchsia-400 bg-fuchsia-950/60 px-1.5 py-0.5 rounded border border-fuchsia-500/40">Studio</span>
                    </div>
                    {v3Voices.map((voice) => {
                      const isSelected = selectedClonedVoiceId === voice.id;
                      const cleanName = voice.name.replace(/^[💎\s]+/, '').split(' - ')[0].trim();
                      const categoryRole =
                        CHARACTERS.find((c) => c.id === voice.category)?.role ||
                        CHARACTERS.find((c) => voice.name.toLowerCase().includes(c.name.toLowerCase()) || (c.id && voice.name.toLowerCase().includes(c.id.toLowerCase())))?.role ||
                        voice.description ||
                        (voice.name.includes(' - ') ? voice.name.split(' - ').slice(1).join(' - ').trim() : '');

                      return (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => {
                            setSelectedClonedVoiceId(voice.id);
                            setIsVoiceDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer flex flex-col gap-0.5 border ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-fuchsia-500/15 border-cyan-400/70 text-cyan-200 font-bold'
                              : 'bg-[#0c121e] hover:bg-cyan-950/30 border-cyan-900/30 text-stone-300'
                          }`}
                        >
                          <span className="text-xs font-semibold truncate text-white">{cleanName}</span>
                          {categoryRole && (
                            <span className="text-[10px] text-cyan-300/80 truncate font-normal">{categoryRole}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Model V2: Output Category Dropdown */
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full bg-gradient-to-r from-[#0a0f1c] via-[#0d1424] to-[#120e20] text-stone-100 px-4 py-2.5 rounded-2xl border border-cyan-500/40 hover:border-cyan-400 cursor-pointer transition-all shadow-[0_0_18px_rgba(0,243,255,0.08)] flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-400 shadow-[0_0_8px_#00f3ff] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-stone-100 tracking-wide truncate">
                    {activeCategoryObj.name}
                  </span>
                </div>
                <div className={`transition-transform duration-200 shrink-0 text-cyan-400 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                  <div
                    id="character-dropdown-menu"
                    role="listbox"
                    className="absolute top-full mt-1.5 left-0 w-full max-h-[60vh] overflow-y-auto bg-[#090d18]/98 border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(0,243,255,0.18)] z-50 p-2 flex flex-col gap-1 backdrop-blur-xl"
                  >
                    <div className="px-3 py-2 border-b border-cyan-900/40 flex items-center justify-between text-xs font-semibold text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <PlayvearIcon className="w-3.5 h-3.5" />
                        <span className="text-cyan-300">Select Output Category</span>
                      </span>
                    </div>
                    {CHARACTERS.map((char) => {
                      const isSelected = char.id === selectedCharacter;
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => {
                            setSelectedCharacter(char.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-fuchsia-500/15 border-cyan-400/70 text-cyan-200 font-bold'
                              : 'border-cyan-950/40 hover:bg-cyan-950/30 text-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wide text-stone-100">{char.name}</span>
                            {isSelected && (
                              <span className="font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-400/50 shadow-[0_0_8px_rgba(0,243,255,0.3)] text-[9px]">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-cyan-300/80 leading-snug font-normal">{char.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Auto-Rotation Notification Toast */}
        {keyRotationToast && (
          <div
            id="key-rotation-toast"
            className="w-full p-3 rounded-xl bg-gradient-to-r from-cyan-950/90 via-[#0e1628] to-fuchsia-950/90 border border-cyan-400/60 text-cyan-200 text-xs font-medium flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,243,255,0.2)] animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 animate-bounce shrink-0" />
              <span>{keyRotationToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setKeyRotationToast(null)}
              className="text-stone-400 hover:text-stone-200 p-1 text-xs shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Script Text Box & Stats Bar */}
        <div className="w-full flex flex-col gap-1.5">
          {/* Daily Free Limit Display above script box */}
          <div
            className="flex items-center gap-1.5 font-mono select-none tracking-wider uppercase text-[8px] sm:text-[9px] px-1"
          >
            <span className={engineMode === 'v4' ? "text-fuchsia-400 font-bold drop-shadow-[0_0_6px_rgba(255,0,234,0.3)]" : "text-cyan-400/90 font-medium drop-shadow-[0_0_6px_rgba(0,243,255,0.25)]"}>
              {engineMode === 'v2' &&
                `DAILY FREE LIMIT: ${Math.max(0, 5 - parseInt(localStorage.getItem('playvear_v2_usage_' + new Date().toISOString().split('T')[0]) || '0', 10))}/5 GENERATIONS REMAINING (1 MIN MAX EACH)`
              }
              {engineMode === 'v3' &&
                `DAILY LIMIT: ${Math.max(0, 1 - parseInt(localStorage.getItem('playvear_v3_usage_' + new Date().toISOString().split('T')[0]) || '0', 10))}/1 GENERATION (MAX 1000 CHARACTERS)`
              }
              {engineMode === 'v4' &&
                `PAID MODEL: UNLIMITED GENERATIONS (${pricingSettings.v4CharRate || 7.2} CREDITS / 1000 CHARS)`
              }
            </span>
          </div>

          <div className="w-full flex flex-col h-[180px] sm:h-[280px] rounded-2xl p-[1px] bg-gradient-to-b from-cyan-500/40 via-cyan-500/20 to-fuchsia-500/30 shadow-[0_0_20px_rgba(0,243,255,0.08)] focus-within:shadow-[0_0_25px_rgba(0,243,255,0.2)] focus-within:from-cyan-400 focus-within:to-fuchsia-400/60 transition-all">
            <textarea
              id="script-input-box"
              value={script}
              onChange={(e) => {
                setScript(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => {
                if (script.trim()) {
                  const converted = convertNumbersAndDatesToBanglaWords(script);
                  if (converted !== script) {
                    setScript(converted);
                  }
                }
              }}
              onPaste={(e) => {
                setTimeout(() => {
                  setScript((current) => {
                    if (!current.trim()) return current;
                    return convertNumbersAndDatesToBanglaWords(current);
                  });
                }, 50);
              }}
              placeholder=""
              className="w-full h-full bg-[#080d16] text-stone-100 placeholder-stone-600 text-sm sm:text-base leading-relaxed p-3.5 sm:p-4 rounded-2xl border-none focus:outline-none transition-all resize-y font-normal selection:bg-cyan-500 selection:text-black"
            />
          </div>

          {/* Character counter & estimated voice length */}
          <div className="flex items-center justify-between px-1 text-xs">
            <div>
              {script.length > (engineMode === 'v3' ? 1000 : engineMode === 'v4' ? 5000 : 1500) && (
                <span className="text-[9px] font-bold text-fuchsia-400 animate-pulse drop-shadow-[0_0_8px_rgba(255,0,234,0.5)]">
                  ⚠️ Too long text
                </span>
              )}
            </div>
            <div
              id="script-counter-stats"
              className="flex items-center gap-2 font-mono select-none tracking-wider uppercase text-[8px] sm:text-[9px]"
            >
              <span id="script-character-count" className="text-cyan-400/90 font-medium">
                Characters: {script.length}
              </span>
              <span className="text-fuchsia-500/60 font-bold">|</span>
              <span id="script-estimated-duration" className="text-cyan-300/90 font-medium">
                Est. Voice: ~{(() => {
                  const clean = script.trim();
                  if (!clean) return '0s';
                  const totalSeconds = Math.max(1, Math.round(clean.length / 13));
                  const mins = Math.floor(totalSeconds / 60);
                  const secs = totalSeconds % 60;
                  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                })()}
              </span>
              {engineMode === 'v4' && script.trim().length > 0 && (
                <>
                  <span className="text-fuchsia-500/60 font-bold">|</span>
                  <span id="script-estimated-cost" className="text-cyan-400/90 font-medium">
                    Estimated Cost: {estimatedCreditCost.toFixed(2)} Credits
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic inline error display */}
        {errorMessage && (
          <div
            id="error-message"
            className="w-full bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-semibold py-2.5 px-4 rounded-xl text-center max-w-md mx-auto shadow-lg animate-in fade-in duration-200 flex items-center justify-between gap-2"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-300 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Generate Button & Small "New" Option - 80% Neon Cyan + 20% Neon Magenta Accent */}
        <div className="flex items-center justify-center gap-3 w-full relative">
          <div className="flex flex-col items-center gap-2">
            <button
              id="generate-voice-btn"
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 via-[#00f3ff] to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(0,243,255,0.45)] hover:shadow-[0_0_35px_rgba(0,243,255,0.7)] border border-cyan-200 transition-all cursor-pointer min-h-[42px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950 stroke-[2.5]" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <PlayvearIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                  <span className="tracking-wide">Generate Voice</span>
                </>
              )}
            </button>
          </div>

          {/* Small "New" text button on the right side of Generate button */}
          {audioUrl && (
            <button
              id="reset-new-screen-btn"
              type="button"
              onClick={handleResetToNew}
              className="text-xs font-bold text-cyan-300 hover:text-white cursor-pointer transition-colors p-2 bg-[#0a0e18] hover:bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-300 rounded-xl select-none shrink-0 min-h-[42px] px-3.5 flex items-center justify-center shadow-[0_0_12px_rgba(0,243,255,0.15)] active:scale-95"
            >
              New
            </button>
          )}
        </div>

        {/* Voice Play Layout & Action Links */}
        {audioUrl && (
          <div id="result-audio-container" className="w-full mt-2">
            <AudioPlayer
              key={audioUrl}
              audioUrl={audioUrl}
              characterId={selectedCharacter}
              scriptText={script}
              onDownloadRaw={handleDownload}
            />
          </div>
        )}
        </main>
      )}

      {/* Step 2: Video Generator View (Identical architecture, design, and layout) */}
      {activeMainTab === 'step2_video' && (
        <div className="flex-1 w-full pb-14 sm:pb-16">
          <VideoGeneratorScreen onOpenVoiceGenerator={() => setActiveMainTab('step1_voice')} />
        </div>
      )}



      {/* Voice & Video History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyItems={historyItems}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
        onSelectScript={handleSelectHistoryScript}
        videoHistoryItems={videoHistoryItems}
        onDeleteVideoItem={handleDeleteVideoItem}
        onClearAllVideos={handleClearAllVideos}
        defaultTab={activeMainTab === 'step2_video' ? 'video' : 'voice'}
      />

      {/* Subtitle Usage Guide Modal */}
      <SubtitleGuideModal
        isOpen={isSubtitleGuideOpen}
        onClose={() => setIsSubtitleGuideOpen(false)}
      />

      {/* Admin Panel & Quota Tracker Modal */}
      <AdminPanelModal
        isOpen={showCartesiaKeyModal}
        onClose={() => setShowCartesiaKeyModal(false)}
        currentApiKey={cartesiaApiKey}
        paidApiKey={cartesiaPaidApiKey}
        onSaveApiKey={(key) => {
          setCartesiaApiKey(key);
          try {
            localStorage.setItem('playvear_cartesia_api_key', key);
          } catch (e) {
            console.warn('Could not save cartesia key to localStorage:', e);
          }
        }}
        onSavePaidApiKey={(key) => {
          setCartesiaPaidApiKey(key);
          try {
            localStorage.setItem('playvear_cartesia_paid_api_key', key);
          } catch (e) {
            console.warn('Could not save cartesia paid key to localStorage:', e);
          }
          loadCartesiaVoices();
        }}
        onKeySwitched={(newIndex) => {
          loadCartesiaVoices(newIndex);
        }}
        userEmail={googleUser?.email || ''}
      />

      {/* Voice Cloning Modal */}
      <VoiceCloningModal
        isOpen={showVoiceCloneModal}
        onClose={() => setShowVoiceCloneModal(false)}
        cartesiaApiKey={cartesiaApiKey}
        cartesiaPaidApiKey={cartesiaPaidApiKey}
        currentUser={googleUser}
        onSavePaidApiKey={(key: string) => {
          setCartesiaPaidApiKey(key);
          try {
            localStorage.setItem('playvear_cartesia_paid_api_key', key);
          } catch (e) {
            console.warn('Could not save cartesia paid key to localStorage:', e);
          }
          loadCartesiaVoices();
        }}
        clonedVoices={clonedVoices}
        activeKeyIndex={activeKeyInfo.index}
        onVoiceCloned={(newVoice) => {
          setClonedVoices((prev) => {
            const exists = prev.some((v) => v.id === newVoice.id);
            const updated = exists ? prev : [newVoice, ...prev];
            if (googleUser?.uid) {
              try {
                localStorage.setItem(`playvear_v4_voices_${googleUser.uid}`, JSON.stringify(updated));
              } catch (e) {
                console.warn('Could not save cloned voices:', e);
              }
            }
            return updated;
          });
          setSelectedClonedVoiceId(newVoice.id);
          setEngineMode('v4');
        }}
        onDeleteVoice={(id) => {
          setClonedVoices((prev) => {
            const updated = prev.filter((v) => v.id !== id);
            if (googleUser?.uid) {
              try {
                localStorage.setItem(`playvear_v4_voices_${googleUser.uid}`, JSON.stringify(updated));
              } catch (e) {
                console.warn('Could not save cloned voices:', e);
              }
            }
            return updated;
          });
          if (selectedClonedVoiceId === id) {
            setSelectedClonedVoiceId(null);
          }
        }}
        selectedClonedVoiceId={selectedClonedVoiceId}
        onSelectClonedVoice={(id) => setSelectedClonedVoiceId(id)}
      />

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={showGoogleAuthModal}
        onClose={() => setShowGoogleAuthModal(false)}
        currentUser={googleUser}
        onLoginSuccess={(user) => {
          setGoogleUser(user);
          setShowGoogleAuthModal(false);
          if (authIntentRef.current === 'voice_clone') {
            setShowVoiceCloneModal(true);
          }
          authIntentRef.current = null;
        }}
        onLogout={() => {
          setGoogleUser(null);
          setClonedVoices([]);
          setSelectedClonedVoiceId(null);
          try {
            localStorage.removeItem('playvear_google_user');
          } catch {}
        }}
      />

      {/* Bottom Navigation Bar */}
      <nav
        id="bottom-navigation-bar"
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#080c14]/95 backdrop-blur-2xl border-t border-cyan-500/25 px-3 py-1.5 shadow-[0_-4px_25px_rgba(0,0,0,0.7)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2">
          {/* Tab 1: Step 1 Voice Generator */}
          <button
            id="nav-tab-step1-voice"
            type="button"
            onClick={() => setActiveMainTab('step1_voice')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative select-none min-h-[34px] active:scale-[0.97] border ${
              activeMainTab === 'step1_voice'
                ? 'bg-gradient-to-r from-cyan-950/80 to-[#0e1728] border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                : 'bg-transparent border-transparent text-stone-400 hover:text-cyan-200 hover:bg-cyan-950/15'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeMainTab === 'step1_voice'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#00f3ff] scale-110 animate-pulse'
                    : 'bg-stone-700/40'
                }`}
              />
              <span className="text-[8px] font-bold tracking-wider uppercase opacity-90 font-mono">
                Step 1
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-tight">
              Generate Voice
            </span>
          </button>

          {/* Tab 2: Step 2 Video Generator */}
          <button
            id="nav-tab-step2-video"
            type="button"
            onClick={() => setActiveMainTab('step2_video')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative select-none min-h-[34px] active:scale-[0.97] border ${
              activeMainTab === 'step2_video'
                ? 'bg-gradient-to-r from-cyan-950/40 to-fuchsia-950/70 border-fuchsia-400/50 text-fuchsia-200 shadow-[0_0_15px_rgba(255,0,234,0.2)]'
                : 'bg-transparent border-transparent text-stone-400 hover:text-fuchsia-200 hover:bg-fuchsia-950/15'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeMainTab === 'step2_video'
                    ? 'bg-fuchsia-400 shadow-[0_0_8px_#ff00ea] scale-110 animate-pulse'
                    : 'bg-stone-700/40'
                }`}
              />
              <span className="text-[8px] font-bold tracking-wider uppercase opacity-90 font-mono">
                Step 2
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-tight">
              Generate Video
            </span>
          </button>
        </div>
      </nav>

      {/* Double Tap Exit Toast Notification */}
      {showExitToast && (
        <div
          id="exit-toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] bg-[#141a26]/95 border border-cyan-500/40 text-stone-200 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md text-xs font-medium tracking-wide animate-in fade-in slide-in-from-bottom-3 duration-150 flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Press back again to exit</span>
        </div>
      )}
      {/* Credits Modal */}
      {googleUser && (
        <CreditsModal
          isOpen={showCreditsModal}
          onClose={() => setShowCreditsModal(false)}
          userId={googleUser.uid || ''}
          userEmail={googleUser.email || ''}
        />
      )}
    </div>
  );
}
