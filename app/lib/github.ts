import { RepoFile } from '@/app/types';

const BASE = 'https://api.github.com';

// ─── AI Commit Message Generator ─────────────────────────────────────────────

/**
 * Generates a meaningful commit message using Claude AI.
 * Falls back to a simple default if the AI call fails.
 */
async function generateCommitMessage(
  fileName: string,
  fileContent: string, // base64
  fileType: string,
  action: 'add' | 'update' | 'delete'
): Promise<string> {
  try {
    // Decode base64 content to get a preview (first ~500 chars)
    let contentPreview = '';
    try {
      const decoded = atob(fileContent);
      // Only use text-like content for context
      if (fileType.includes('text') || fileType.includes('javascript') ||
          fileType.includes('typescript') || fileType.includes('json') ||
          fileType.includes('html') || fileType.includes('css') ||
          fileType.includes('python') || fileType.includes('markdown') ||
          fileName.match(/\.(ts|tsx|js|jsx|py|java|go|rs|php|rb|md|txt|json|yaml|yml|xml|html|css|scss|sh|bash)$/i)) {
        contentPreview = decoded.slice(0, 600);
      }
    } catch {
      // binary file, skip preview
    }

    const prompt = contentPreview
      ? `Generate a concise, professional git commit message for this file action:
- Action: ${action}
- File: ${fileName}
- Content preview:
\`\`\`
${contentPreview}
\`\`\`

Rules:
- Start with a verb in imperative mood (Add, Update, Fix, Refactor, etc.)
- Be specific about what the file does or contains
- Max 72 characters
- No quotes, no period at end
- Examples: "Add authentication middleware for JWT validation", "Update user profile component with avatar upload"

Output ONLY the commit message, nothing else.`
      : `Generate a concise, professional git commit message for this file action:
- Action: ${action}
- File: ${fileName}
- File type: ${fileType || 'binary/unknown'}

Rules:
- Start with a verb in imperative mood (Add, Update, Fix, etc.)
- Be specific about the file name and likely purpose
- Max 72 characters
- No quotes, no period at end

Output ONLY the commit message, nothing else.`;

    const res = await fetch('/api/ai-commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error('AI commit API failed');

    const data = await res.json();
    const message = (data.message || '').trim();

    // Validate: not empty, not too long
    if (message && message.length > 3 && message.length <= 120) {
      return message;
    }
    throw new Error('Invalid AI response');
  } catch {
    // Fallback: smarter static message based on file type & name
    return buildFallbackMessage(fileName, action);
  }
}

/**
 * Builds a smarter fallback commit message without AI.
 */
function buildFallbackMessage(fileName: string, action: 'add' | 'update' | 'delete'): string {
  const name = fileName.split('/').pop() || fileName;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const base = name.replace(/\.[^.]+$/, '');

  const verbMap: Record<string, string> = {
    add: 'Add',
    update: 'Update',
    delete: 'Remove',
  };
  const verb = verbMap[action] || 'Add';

  // Context-aware descriptions based on file name patterns
  if (name.match(/readme/i)) return `${verb} README documentation`;
  if (name.match(/license/i)) return `${verb} project license`;
  if (name.match(/\.gitignore/)) return `${verb} .gitignore rules`;
  if (name.match(/dockerfile/i)) return `${verb} Dockerfile for containerization`;
  if (name.match(/docker-compose/i)) return `${verb} Docker Compose configuration`;
  if (name.match(/package\.json/)) return `${verb} package.json dependencies`;
  if (name.match(/tsconfig/)) return `${verb} TypeScript configuration`;
  if (name.match(/eslint|prettier|stylelint/i)) return `${verb} ${base} linting configuration`;
  if (name.match(/\.env/i)) return `${verb} environment configuration`;
  if (name.match(/index\.(ts|tsx|js|jsx)$/i)) return `${verb} module entry point`;
  if (name.match(/\.test\.|\.spec\./i)) return `${verb} test suite for ${base.replace(/\.(test|spec)$/, '')}`;
  if (name.match(/types?\.(ts|tsx|d\.ts)$/i)) return `${verb} TypeScript type definitions`;

  // Extension-based fallbacks
  const extMessages: Record<string, string> = {
    ts: `${verb} ${base} TypeScript module`,
    tsx: `${verb} ${base} React component`,
    js: `${verb} ${base} JavaScript module`,
    jsx: `${verb} ${base} React component`,
    py: `${verb} ${base} Python script`,
    java: `${verb} ${base} Java class`,
    go: `${verb} ${base} Go module`,
    rs: `${verb} ${base} Rust module`,
    rb: `${verb} ${base} Ruby script`,
    php: `${verb} ${base} PHP module`,
    css: `${verb} ${base} styles`,
    scss: `${verb} ${base} SCSS styles`,
    html: `${verb} ${base} HTML template`,
    json: `${verb} ${base} configuration`,
    yaml: `${verb} ${base} YAML configuration`,
    yml: `${verb} ${base} YAML configuration`,
    md: `${verb} ${base} documentation`,
    txt: `${verb} ${base} text file`,
    sh: `${verb} ${base} shell script`,
    sql: `${verb} ${base} SQL migration`,
    png: `${verb} ${base} image asset`,
    jpg: `${verb} ${base} image asset`,
    jpeg: `${verb} ${base} image asset`,
    svg: `${verb} ${base} SVG graphic`,
    pdf: `${verb} ${base} PDF document`,
  };

  return extMessages[ext] || `${verb} ${fileName}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
  // encode từng segment riêng để giữ dấu / → GitHub tạo đúng folder
  const path = file.name.split('/').map(encodeURIComponent).join('/');

  // 🆕 Generate AI commit message instead of hardcoded "Add ..."
  const commitMessage = await generateCommitMessage(file.name, file.content, file.type, 'add');

  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: commitMessage,  // 🆕 was: `Add ${file.name}`
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
  return Array.isArray(data) ? data : [data];
}

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

  const action: 'add' | 'update' = sha ? 'update' : 'add';

  // 🆕 Generate AI commit message instead of hardcoded "Add/Update ..."
  const commitMessage = await generateCommitMessage(file.name, file.content, file.type, action);

  const body: Record<string, unknown> = {
    message: commitMessage,  // 🆕 was: sha ? `Update ${file.name}` : `Add ${file.name}`
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

export async function deleteRepoFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  sha: string,
  branch?: string
): Promise<void> {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');

  // 🆕 AI-generated delete message too
  const commitMessage = await generateCommitMessage(filePath, '', 'application/octet-stream', 'delete');

  const body: Record<string, unknown> = {
    message: commitMessage,  // 🆕 was: `Delete ${filePath}`
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

export async function replaceAllRepoFiles(
  token: string,
  owner: string,
  repo: string,
  newFiles: RepoFile[],
  branch?: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Đang lấy danh sách file hiện tại...');
  const existing = await listRepoContents(token, owner, repo);
  const existingFiles = existing.filter(item => item.type === 'file');

  for (const f of existingFiles) {
    onProgress?.(`Xoá ${f.name}...`);
    await deleteRepoFile(token, owner, repo, f.path, f.sha, branch);
  }

  for (const f of newFiles) {
    onProgress?.(`Upload ${f.name}...`);
    await upsertFile(token, owner, repo, f, branch);
  }
}