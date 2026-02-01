
export enum AppTab {
  CHAT = 'chat',
  VOICE = 'voice',
  IMAGE = 'image'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundingUrls?: Array<{ title: string; uri: string }>;
}

export interface TranscriptionEntry {
  id: string;
  type: 'user' | 'model';
  text: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: string;
}
