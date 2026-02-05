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
  content: string; 
  cbtData?: CBTData; 
  language: string;
  title: string;
  isActive: boolean;
}

export type UserRole = 'personal' | 'student' | 'teacher' | 'school_admin';

export interface InstitutionMember {
  uid?: string;
  email: string;
  password?: string; // Stored for initial provisioning
  name: string;
  role: 'student' | 'teacher';
  dateAdded: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  adminEmail: string;
  members: InstitutionMember[];
}