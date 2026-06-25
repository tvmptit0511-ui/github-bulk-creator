import { NextRequest, NextResponse } from 'next/server';

// POST /api/ai-commit
// Body: { fileName: string; repoName: string; isUpdate: boolean; fileType?: string }
// Returns: { message: string }
//
// Dùng Google Gemini Flash — FREE tier: 1500 requests/ngày, không cần credit card
// Lấy API key tại: https://aistudio.google.com/apikey

export async function POST(req: NextRequest) {
  try {
    const { fileName, repoName, isUpdate, fileType } = await req.json();

    const fallback = isUpdate ? `Update ${fileName}` : `Add ${fileName}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: fallback });
    }

    // Map extension → ngôn ngữ để AI hiểu rõ hơn
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const langMap: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
      py: 'Python', java: 'Java', cpp: 'C++', c: 'C', cs: 'C#', go: 'Go', rs: 'Rust',
      html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', md: 'Markdown',
      yml: 'YAML', yaml: 'YAML', sh: 'Shell', sql: 'SQL', php: 'PHP', rb: 'Ruby',
      swift: 'Swift', kt: 'Kotlin', dart: 'Dart', vue: 'Vue', svelte: 'Svelte',
      env: 'Config', gitignore: 'Git config', dockerfile: 'Docker', lock: 'Lockfile',
    };
    const lang = langMap[ext] ?? fileType ?? (ext ? ext.toUpperCase() : 'file');
    const shortName = fileName.split('/').pop() ?? fileName;
    const scopeName = shortName.replace(/\.[^.]+$/, ''); // bỏ extension làm scope
    const folder = fileName.includes('/') ? fileName.split('/').slice(0, -1).join('/') : '';

    const prompt = `Generate a git commit message using Conventional Commits format.

File info:
- File: ${fileName}${folder ? ` (in folder: ${folder})` : ''}
- Language: ${lang}
- Repo: ${repoName}
- Action: ${isUpdate ? 'updating existing file' : 'adding new file'}

Format: <type>(<scope>): <short description>
- type: feat | fix | docs | style | refactor | test | chore | build | ci
- scope: "${scopeName}" (the filename without extension)  
- description: imperative mood, lowercase, under 50 chars, no period

Good examples:
feat(auth): add JWT middleware for protected routes
fix(api): handle null response from user endpoint
docs(readme): update setup instructions
chore(config): add prettier formatting rules
refactor(utils): simplify date parsing logic

Reply with ONLY the commit message. No explanation, no quotes, no markdown.`;

    // Gemini 2.0 Flash — model free nhanh nhất hiện tại
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 60,
          temperature: 0.4,      // hơi creative nhưng vẫn consistent
          topP: 0.9,
        },
      }),
    });

    if (!res.ok) return NextResponse.json({ message: fallback });

    const data = await res.json();
    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Sanitize output
    const message = raw
      .trim()
      .split('\n')[0]            // chỉ lấy dòng đầu tiên
      .replace(/^["'`]|["'`]$/g, '')  // bỏ quotes nếu model bọc
      .replace(/\*+/g, '')       // bỏ markdown bold
      .trim();

    // Validate: phải có format hợp lệ và không quá dài
    const isValid = message.length > 5 && message.length <= 100;
    return NextResponse.json({ message: isValid ? message : fallback });

  } catch {
    // Không bao giờ crash — luôn trả về fallback
    return NextResponse.json({ message: 'chore: update project files' }, { status: 200 });
  }
}