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
  content: string;
  language: string;
  title: string;
  isActive: boolean;
}

export type UserRole = 'student' | 'school_admin';

export interface SchoolProfile {
  name: string;
  adminEmail: string;
  studentNodes: string[]; // List of student emails
}