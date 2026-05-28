export interface RepoFile {
  id: string;
  name: string;
  content: string; // base64
  size: number;
  type: string;
}

export interface RepoConfig {
  name: string;
  description: string;
  isPrivate: boolean;
  autoInit: boolean;
  files: RepoFile[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  username: string;
  repos: string[];
  results: { name: string; status: 'ok' | 'err'; url?: string; error?: string }[];
}

export type CreationMode = 'range' | 'manual' | 'free';
export type LogStatus = 'pending' | 'running' | 'ok' | 'error' | 'skip';

export interface LogItem {
  name: string;
  status: LogStatus;
  message: string;
  url?: string;
}
