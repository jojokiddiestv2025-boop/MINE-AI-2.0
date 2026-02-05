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

export interface CBTQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CBTData {
  title: string;
  subject: string;
  timeLimit: number; // in minutes
  questions: CBTQuestion[];
}

export interface WorkspaceState {
  type: 'markdown' | 'cbt';
  content: string; // Used for markdown
  cbtData?: CBTData; // Used for CBT
  language: string;
  title: string;
  isActive: boolean;
}

export type UserRole = 'personal' | 'student' | 'teacher' | 'school_admin';

export interface SchoolProfile {
  name: string;
  adminEmail: string;
  studentNodes: string[]; 
  teacherNodes: string[];
}