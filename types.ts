
export interface TranscriptionEntry {
  id: string;
  type: 'user' | 'model';
  text: string;
}

export interface VisualContext {
  id: string;
  data: string; // base64
  mimeType: string;
}

export interface WorkspaceState {
  type: 'markdown' | 'image' | 'conversion';
  content?: string; 
  imageUrl?: string;
  language?: string;
  title: string;
  isActive: boolean;
  isProcessing?: boolean;
  conversionData?: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    progress: number;
    type: 'word_to_pdf' | 'mp4_to_mp3' | 'url_to_mp3';
    resultUrl?: string;
    resultName?: string;
  };
}

export type UserRole = 'personal';

export interface InstitutionMember {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'teacher';
  dateAdded: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  adminEmail: string;
  members: InstitutionMember[];
}
