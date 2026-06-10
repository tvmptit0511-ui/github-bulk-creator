import { RepoFile } from '@/app/types';

const BASE = 'https://api.github.com';

export async function createRepo(
  token: string,
  name: string,
  description: string,
  isPrivate: boolean,
  autoInit: boolean
) {
  const res = await fetch(`${BASE}/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ name, description, private: isPrivate, auto_init: autoInit }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.errors?.map((e: { message: string }) => e.message).join(', ') || data.message || 'Unknown error';
    throw new Error(msg);
  }
  return data;
}

export async function uploadFile(
  token: string,
  owner: string,
  repo: string,
  file: RepoFile
) {
  const path = encodeURIComponent(file.name);
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: `Add ${file.name}`,
      content: file.content,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Upload failed');
  }
  return await res.json();
}

export async function getUser(token: string) {
  const res = await fetch(`${BASE}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error('Invalid token or unauthorized');
  return await res.json();
}

/**
 * Lấy danh sách OAuth scopes từ header X-OAuth-Scopes
 * Trả về mảng scope, vd: ['repo', 'read:org', 'user']
 */
export async function getTokenScopes(token: string): Promise<string[]> {
  const res = await fetch(`${BASE}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error('Invalid token or unauthorized');
  const scopeHeader = res.headers.get('x-oauth-scopes') || '';
  return scopeHeader
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Kiểm tra token có quyền đọc org hay không
 */
export function hasOrgScope(scopes: string[]): boolean {
  return scopes.some(s =>
    s === 'read:org' || s === 'write:org' || s === 'admin:org'
  );
}

// ─── Repo Management ───────────────────────────────────────────────────────────

export interface RepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  fork: boolean;
}

export async function listUserRepos(
  token: string,
  page = 1,
  perPage = 100
): Promise<RepoInfo[]> {
  const res = await fetch(
    `${BASE}/user/repos?per_page=${perPage}&page=${page}&sort=updated&type=owner`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  if (!res.ok) throw new Error('Không thể tải danh sách repo');
  return await res.json();
}

export async function updateRepo(
  token: string,
  owner: string,
  oldName: string,
  updates: {
    name?: string;
    description?: string;
    private?: boolean;
    has_issues?: boolean;
    has_wiki?: boolean;
    default_branch?: string;
  }
) {
  const res = await fetch(`${BASE}/repos/${owner}/${oldName}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      data.errors?.map((e: { message: string }) => e.message).join(', ') ||
      data.message ||
      'Unknown error';
    throw new Error(msg);
  }
  return data;
}

export async function deleteRepo(
  token: string,
  owner: string,
  repoName: string
) {
  const res = await fetch(`${BASE}/repos/${owner}/${repoName}`, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 204) return; // success
  const data = await res.json().catch(() => ({}));
  throw new Error(data.message || 'Không thể xoá repo');
}

export async function transferRepo(
  token: string,
  owner: string,
  repoName: string,
  newOwner: string
) {
  const res = await fetch(`${BASE}/repos/${owner}/${repoName}/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ new_owner: newOwner }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Không thể chuyển repo');
  }
  return data;
}