export interface VideoGenerationSettings {
  prompt: string;
  imageUrl: string;
  imagePreviewName?: string;
  audioUrl?: string;
  audioName?: string;
  audioDurationSeconds?: number;
  duration: number; // 5 to 15 seconds
  resolution: '480p' | '768p' | '1080p' | '2K';
  model: string;
}

export interface GenerationHistoryItem {
  id: string;
  videoUrl: string;
  prompt: string;
  imageUrl?: string;
  audioName?: string;
  duration: number;
  resolution: string;
  model: string;
  costUsd: number;
  costBdt: number;
  createdAt: string;
}

export interface PresetPresenter {
  id: string;
  name: string;
  banglaName: string;
  role: string;
  title: string;
  imagePath: string;
  recommendedPrompt: string;
  audioName: string;
  audioStyle: 'anchor' | 'creator';
  duration: number;
}

export interface AudioSample {
  id: string;
  title: string;
  category: string;
  durationText: string;
  transcript: string;
  url: string; // pre-bundled or synthetic tone / base64
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  provider: 'google' | 'guest';
  signedInAt: string;
}
