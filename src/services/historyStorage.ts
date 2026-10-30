import { CharacterId, CHARACTERS } from '../types';

export interface HistoryVoiceItem {
  id: string;
  character: string;
  characterName: string;
  script: string;
  audioBase64: string;
  mimeType: string;
  format?: string;
  createdAt: number;
  formattedDate: string;
}

export interface SaveVoiceInput {
  character: string;
  script: string;
  audioBase64: string;
  mimeType?: string;
  format?: string;
}

export interface HistoryVideoItem {
  id: string;
  title: string;
  videoBlob?: Blob;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  resolution: string;
  model: string;
  prompt?: string;
  createdAt: number;
  formattedDate: string;
}

export interface SaveVideoInput {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  resolution?: string;
  model?: string;
  prompt?: string;
}

const DB_NAME = 'playvear_media_db';
const VOICE_STORE = 'voices';
const VIDEO_STORE = 'videos';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VOICE_STORE)) {
        db.createObjectStore(VOICE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('bn-BD', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCharacterDisplayName(characterId: string): string {
  const found = CHARACTERS.find((c) => c.id === characterId);
  return found ? found.name : characterId;
}

// ======================== VOICE STORAGE ========================

export async function getAllVoicesFromDevice(): Promise<HistoryVoiceItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(VOICE_STORE, 'readonly');
      const store = tx.objectStore(VOICE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result as HistoryVoiceItem[]) || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => {
        resolve(getFromLocalStorageVoices());
      };
    });
  } catch {
    return getFromLocalStorageVoices();
  }
}

function getFromLocalStorageVoices(): HistoryVoiceItem[] {
  try {
    const data = localStorage.getItem('playvear_history_items');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorageVoices(items: HistoryVoiceItem[]): void {
  try {
    localStorage.setItem('playvear_history_items', JSON.stringify(items.slice(0, 30)));
  } catch {
    // Ignore storage limit
  }
}

export async function saveVoiceToDevice(input: SaveVoiceInput): Promise<HistoryVoiceItem> {
  const now = Date.now();
  const newItem: HistoryVoiceItem = {
    id: `voice_${now}_${Math.random().toString(36).substring(2, 8)}`,
    character: input.character,
    characterName: getCharacterDisplayName(input.character),
    script: input.script,
    audioBase64: input.audioBase64,
    mimeType: input.mimeType || 'audio/mpeg',
    format: input.format || 'mp3',
    createdAt: now,
    formattedDate: formatDate(now),
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VOICE_STORE, 'readwrite');
      const store = tx.objectStore(VOICE_STORE);
      const request = store.put(newItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    const items = getFromLocalStorageVoices();
    saveToLocalStorageVoices([newItem, ...items]);
  }

  return newItem;
}

export async function deleteVoiceFromDevice(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VOICE_STORE, 'readwrite');
      const store = tx.objectStore(VOICE_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    const items = getFromLocalStorageVoices().filter((item) => item.id !== id);
    saveToLocalStorageVoices(items);
  }
}

export async function clearAllVoicesFromDevice(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VOICE_STORE, 'readwrite');
      const store = tx.objectStore(VOICE_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    saveToLocalStorageVoices([]);
  }
}

export async function downloadVoiceMP3(item: HistoryVoiceItem): Promise<void> {
  try {
    const byteCharacters = atob(item.audioBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: item.mimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = item.format === 'wav' ? 'wav' : 'mp3';
    a.download = `${item.character || 'voice'}_${item.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Download error:', err);
  }
}

// ======================== VIDEO STORAGE (LOCAL DEVICE CACHE) ========================

/**
 * Fetch video blob either directly or via proxy to guarantee binary caching in IndexedDB
 */
async function fetchVideoAsBlob(videoUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(videoUrl);
    if (res.ok) {
      return await res.blob();
    }
  } catch (err) {
    console.warn('Direct fetch failed, trying proxy download for local cache:', err);
  }

  try {
    const proxyUrl = `/api/download-video?url=${encodeURIComponent(videoUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.blob();
    }
  } catch (err) {
    console.warn('Proxy video fetch also failed:', err);
  }
  return null;
}

/**
 * Save and cache generated video into device's IndexedDB.
 * Strictly local - no online database or server storage.
 */
export async function saveVideoToDevice(input: SaveVideoInput): Promise<HistoryVideoItem> {
  const now = Date.now();
  
  // Immediately attempt to fetch the video file as a binary Blob so it survives even if remote URL expires
  const blob = await fetchVideoAsBlob(input.videoUrl);

  const newItem: HistoryVideoItem = {
    id: `vid_${now}_${Math.random().toString(36).substring(2, 8)}`,
    title: input.title || 'AI Presenter Video',
    videoBlob: blob || undefined,
    videoUrl: input.videoUrl,
    thumbnailUrl: input.thumbnailUrl,
    duration: input.duration || 12,
    resolution: input.resolution || '768p',
    model: input.model || 'HeyGen Video',
    prompt: input.prompt || '',
    createdAt: now,
    formattedDate: formatDate(now),
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_STORE);
      const request = store.put(newItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB video save error:', err);
    // Fallback: save metadata to localStorage if IndexedDB fails
    const metaList = getFromLocalStorageVideos();
    const safeItem = { ...newItem, videoBlob: undefined };
    localStorage.setItem('playvear_video_history_meta', JSON.stringify([safeItem, ...metaList].slice(0, 20)));
  }

  // Dispatch custom event to notify components that history was updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('video-saved-to-history', { detail: newItem }));
  }

  return newItem;
}

function getFromLocalStorageVideos(): HistoryVideoItem[] {
  try {
    const data = localStorage.getItem('playvear_video_history_meta');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getAllVideosFromDevice(): Promise<HistoryVideoItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(VIDEO_STORE, 'readonly');
      const store = tx.objectStore(VIDEO_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result as HistoryVideoItem[]) || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => {
        resolve(getFromLocalStorageVideos());
      };
    });
  } catch {
    return getFromLocalStorageVideos();
  }
}

export async function deleteVideoFromDevice(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    const items = getFromLocalStorageVideos().filter((item) => item.id !== id);
    localStorage.setItem('playvear_video_history_meta', JSON.stringify(items));
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('video-saved-to-history'));
  }
}

export async function clearAllVideosFromDevice(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    localStorage.removeItem('playvear_video_history_meta');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('video-saved-to-history'));
  }
}

export async function downloadVideoMP4(item: HistoryVideoItem): Promise<void> {
  try {
    let downloadUrl = item.videoUrl;
    let isBlobUrl = false;

    if (item.videoBlob) {
      downloadUrl = URL.createObjectURL(item.videoBlob);
      isBlobUrl = true;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    const cleanTitle = (item.title || 'playvear_video').replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
    a.download = `${cleanTitle}_${item.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (isBlobUrl) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    }
  } catch (err) {
    console.error('Video download error:', err);
  }
}
