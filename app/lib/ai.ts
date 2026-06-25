// app/lib/ai.ts
// Client-side helper — gọi /api/ai-commit để sinh commit message bằng Gemini Flash (free).
// API key ở server-side (route.ts), không bao giờ lộ ra browser.

// Cache trong session: cùng file + repo chỉ gọi AI 1 lần duy nhất
const commitCache = new Map<string, string>();

export async function generateCommitMessage(
  fileName: string,
  repoName: string,
  isUpdate: boolean,
  fileType?: string,
): Promise<string> {
  const cacheKey = `${repoName}::${fileName}::${isUpdate}`;
  if (commitCache.has(cacheKey)) return commitCache.get(cacheKey)!;

  const fallback = isUpdate ? `Update ${fileName}` : `Add ${fileName}`;

  try {
    const controller = new AbortController();
    // Timeout 5s — nếu AI chậm thì dùng fallback, không block upload
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('/api/ai-commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, repoName, isUpdate, fileType }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return fallback;

    const data = await res.json();
    const message: string = data.message?.trim() || fallback;

    commitCache.set(cacheKey, message);
    return message;
  } catch {
    // Timeout hoặc network error → fallback im lặng
    return fallback;
  }
}

// Gọi sau mỗi lần push xong để cache không stale cho lần sau
export function clearCommitCache() {
  commitCache.clear();
}