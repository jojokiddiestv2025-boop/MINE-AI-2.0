
export interface VisualContext {
  id: string;
  data: string; // base64
  mimeType: string;
}

export interface WorkspaceState {
  type: 'markdown' | 'code' | 'preview' | 'cbt';
  content: string; 
  language?: string;
  title: string;
  isActive: boolean;
  isProcessing?: boolean;
}

export type UserRole = 'personal';
