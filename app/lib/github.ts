import { RepoFile } from '@/app/types';

const BASE = 'https://api.github.com';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Lấy danh sách scope của token từ response header */
export async function getTokenScopes(token: string): Promise<string[]> {
  const res = await fetch(`${BASE}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  const raw = res.headers.get('x-oauth-scopes') ?? '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/** Kiểm tra token có đủ quyền tạo repo trong org không */
export function hasOrgScope(scopes: string[]): boolean {
  // 'repo' là bắt buộc; 'read:org' hoặc 'admin:org' để list org
  const hasRepo = scopes.includes('repo');
  const hasOrg = scopes.some(s =>
    ['admin:org', 'write:org', 'read:org'].includes(s)
  );
  return hasRepo && hasOrg;
}

// ─── repo operations ─────────────────────────────────────────────────────────

export async function createRepo(
  token: string,
  owner: string,
  name: string,
  description: string,
  isPrivate: boolean,
  autoInit: boolean,
  ownerType: 'personal' | 'org' = 'personal'
) {
  const url =
    ownerType === 'org'
      ? `${BASE}/orgs/${owner}/repos`
      : `${BASE}/user/repos`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: autoInit,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Cụ thể hoá thông báo lỗi cho từng trường hợp phổ biến
    if (res.status === 404 && ownerType === 'org') {
      throw new Error(
        `Không tìm thấy organization "${owner}". Kiểm tra lại tên org hoặc token có quyền truy cập.`
      );
    }
    if (res.status === 403 && ownerType === 'org') {
      throw new Error(
        `Token không đủ quyền tạo repo trong org "${owner}". Cần quyền "repo" và bạn phải là Owner hoặc được cấp quyền tạo repo trong org.`
      );
    }
    if (res.status === 422) {
      const msg =
        data.errors?.map((e: { message: string }) => e.message).join(', ') ||
        data.message ||
        'Dữ liệu không hợp lệ (repo đã tồn tại?)';
      throw new Error(msg);
    }
    const msg =
      data.errors?.map((e: { message: string }) => e.message).join(', ') ||
      data.message ||
      'Unknown error';
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
  // Hỗ trợ path có thư mục con, encode từng đoạn riêng lẻ
  const safePath = file.name
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${safePath}`, {
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

// ─── user / org ───────────────────────────────────────────────────────────────

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
 * Lấy toàn bộ org mà user thuộc về (có pagination, tối đa 1000 org).
 * Trả về [] thay vì throw khi token thiếu scope read:org.
 */
export async function getUserOrgs(token: string): Promise<string[]> {
  const all: string[] = [];
  let page = 1;

  while (all.length < 1000) {
    const res = await fetch(
      `${BASE}/user/orgs?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) break; // thiếu scope hoặc lỗi mạng → dừng im lặng

    const data: Array<{ login: string }> = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    all.push(...data.map(o => o.login));
    if (data.length < 100) break; // trang cuối
    page++;
  }

  return all;
}

/**
 * Kiểm tra quyền của user đối với một org cụ thể.
 * Trả về role: 'admin' | 'member' | 'none'
 */
export async function getOrgMembership(
  token: string,
  username: string,
  org: string
): Promise<'admin' | 'member' | 'none'> {
  try {
    const res = await fetch(`${BASE}/orgs/${org}/memberships/${username}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return 'none';
    const data = await res.json();
    return data.role === 'admin' ? 'admin' : 'member';
  } catch {
    return 'none';
  }
}