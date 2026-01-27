export enum ViewMode {
  AUDIOBOOK = 'AUDIOBOOK',
  VISUALIZER = 'VISUALIZER',
  SYSTEM_LOG = 'SYSTEM_LOG',
  LIVE_INTERROGATION = 'LIVE_INTERROGATION'
}

export interface Chapter {
  id: string;
  title: string;
  date: string;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Augment window for AI Studio key selection
declare global {
  interface Window {
    // Helper for audio context
    webkitAudioContext: typeof AudioContext;
  }
}