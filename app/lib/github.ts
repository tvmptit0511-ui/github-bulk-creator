import { RepoFile } from '@/app/types';

const BASE = 'https://api.github.com';

export async function createRepo(
  token: string,
  name: string,
  description: string,
  isPrivate: boolean,
  autoInit: boolean,
  org?: string
) {
  const url = org ? `${BASE}/orgs/${org}/repos` : `${BASE}/user/repos`;
  const res = await fetch(url, {
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

export function hasOrgScope(scopes: string[]): boolean {
  return scopes.some(s =>
    s === 'read:org' || s === 'write:org' || s === 'admin:org'
  );
}

// ─── Org ──────────────────────────────────────────────────────────────────────

export interface OrgInfo {
  login: string;
  avatar_url: string;
  description: string | null;
}

export async function listUserOrgs(token: string): Promise<OrgInfo[]> {
  const res = await fetch(`${BASE}/user/orgs?per_page=100`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error('Không thể tải danh sách tổ chức');
  return await res.json();
}

// ─── Repo Management ──────────────────────────────────────────────────────────

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

export async function listOrgRepos(
  token: string,
  org: string,
  page = 1,
  perPage = 100
): Promise<RepoInfo[]> {
  const res = await fetch(
    `${BASE}/orgs/${org}/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  if (!res.ok) throw new Error(`Không thể tải repo của tổ chức ${org}`);
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
  // Lọc bỏ các field undefined để tránh gửi body rỗng lên GitHub API
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(cleanUpdates).length === 0) {
    throw new Error('Không có thay đổi nào để cập nhật');
  }

  const res = await fetch(`${BASE}/repos/${owner}/${oldName}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(cleanUpdates),
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
  if (res.status === 204) return;
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

// ─── File Management ──────────────────────────────────────────────────────────

export interface RepoContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url: string | null;
}

/** List files/dirs at a given path inside a repo */
export async function listRepoContents(
  token: string,
  owner: string,
  repo: string,
  path = ''
): Promise<RepoContentItem[]> {
  const url = path
    ? `${BASE}/repos/${owner}/${repo}/contents/${path}`
    : `${BASE}/repos/${owner}/${repo}/contents`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Không thể lấy danh sách file');
  }
  const data = await res.json();
  // GitHub returns a single object when path is a file
  return Array.isArray(data) ? data : [data];
}

/** Upload or overwrite a single file (upsert) */
export async function upsertFile(
  token: string,
  owner: string,
  repo: string,
  file: RepoFile,
  branch?: string
): Promise<void> {
  const encodedPath = file.name.split('/').map(encodeURIComponent).join('/');
  const url = `${BASE}/repos/${owner}/${repo}/contents/${encodedPath}`;

  // Check if file exists to get SHA (needed for update)
  let sha: string | undefined;
  try {
    const check = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
    }
  } catch {
    // file does not exist — that's fine
  }

  const body: Record<string, unknown> = {
    message: sha ? `Update ${file.name}` : `Add ${file.name}`,
    content: file.content,
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Không thể upload ${file.name}`);
  }
}

/** Delete a single file by path */
export async function deleteRepoFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  sha: string,
  branch?: string
): Promise<void> {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const body: Record<string, unknown> = {
    message: `Delete ${filePath}`,
    sha,
  };
  if (branch) body.branch = branch;

  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Không thể xoá ${filePath}`);
  }
}

/** Replace ALL files in repo: delete everything then upload new files */
export async function replaceAllRepoFiles(
  token: string,
  owner: string,
  repo: string,
  newFiles: RepoFile[],
  branch?: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  // 1. List existing files
  onProgress?.('Đang lấy danh sách file hiện tại...');
  const existing = await listRepoContents(token, owner, repo);
  const existingFiles = existing.filter(item => item.type === 'file');

  // 2. Delete all existing files
  for (const f of existingFiles) {
    onProgress?.(`Xoá ${f.name}...`);
    await deleteRepoFile(token, owner, repo, f.path, f.sha, branch);
  }

  // 3. Upload new files
  for (const f of newFiles) {
    onProgress?.(`Upload ${f.name}...`);
    await upsertFile(token, owner, repo, f, branch);
  }
}