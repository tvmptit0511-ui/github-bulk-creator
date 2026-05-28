import { RepoFile } from '@/app/types';

const BASE = 'https://api.github.com';

export async function createRepo(
  token: string,
  owner: string,
  name: string,
  description: string,
  isPrivate: boolean,
  autoInit: boolean,
  ownerType: 'personal' | 'org' = 'personal'
) {
  const url = ownerType === 'org'
    ? `${BASE}/orgs/${owner}/repos`
    : `${BASE}/user/repos`;

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

export async function getUserOrgs(token: string): Promise<string[]> {
  const res = await fetch(`${BASE}/user/orgs`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((o: { login: string }) => o.login);
}