import { HistoryEntry } from '@/app/types';

const KEY = 'gh-bulk-history';
const MAX = 50;

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveHistory(entry: HistoryEntry) {
  const list = getHistory();
  list.unshift(entry);
  if (list.length > MAX) list.splice(MAX);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteHistory(id: string) {
  const list = getHistory().filter(e => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}

export function saveToken(token: string) {
  localStorage.setItem('gh-token', token);
}

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('gh-token') || '';
}

export function saveUsername(u: string) {
  localStorage.setItem('gh-username', u);
}

export function getUsername(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('gh-username') || '';
}
