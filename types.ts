
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
  type: 'markdown';
  content: string; 
  language: string;
  title: string;
  isActive: boolean;
}

export type UserRole = 'personal';

// Fix: Added missing InstitutionMember interface for school management
export interface InstitutionMember {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'teacher';
  dateAdded: string;
}

// Fix: Added missing SchoolProfile interface for school management
export interface SchoolProfile {
  id: string;
  name: string;
  adminEmail: string;
  members: InstitutionMember[];
}
