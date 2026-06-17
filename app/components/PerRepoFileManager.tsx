'use client';
import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Upload, X, File, FileCode, FileText, Image, Copy, Trash2, FolderOpen } from 'lucide-react';
import { RepoFile } from '@/app/types';

export interface RepoEntry {
  name: string;
  files: RepoFile[];
}

interface Props {
  repos: RepoEntry[];
  onChange: (repos: RepoEntry[]) => void;
  sharedFiles: RepoFile[];
  onSharedChange: (files: RepoFile[]) => void;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={12} />;
  if (['javascript', 'typescript', 'python', 'html', 'css', 'json'].some(t => type.includes(t))) return <FileCode size={12} />;
  if (type.includes('text')) return <FileText size={12} />;
  return <File size={12} />;
}

function formatBytes(b: number) {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(0) + 'KB';
  return (b / 1048576).toFixed(1) + 'MB';
}

// ── Folder traversal helpers (mirror of FileUploader.tsx) ────────────────────
function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise(resolve => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        entries => { if (entries.length === 0) resolve(all); else { all.push(...entries); readBatch(); } },
        () => resolve(all)
      );
    };
    readBatch();
  });
}

function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise(resolve => { entry.file(f => resolve(f), () => resolve(null)); });
}

async function traverseEntry(entry: FileSystemEntry, prefix = ''): Promise<{ path: string; file: File }[]> {
  try {
    if (entry.isFile) {
      const file = await getFileFromEntry(entry as FileSystemFileEntry);
      if (!file) return [];
      return [{ path: prefix + entry.name, file }];
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await readAllEntries(reader);
      const results: { path: string; file: File }[] = [];
      for (const child of children) results.push(...await traverseEntry(child, prefix + entry.name + '/'));
      return results;
    }
  } catch { /* bỏ qua entry lỗi */ }
  return [];
}

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    if (file.size === 0) { res(btoa('\n')); return; }
    const r = new FileReader();
    r.onload = () => { const s = r.result as string; res(s.includes(',') ? s.split(',')[1] : s); };
    r.onerror = () => rej(new Error(r.error?.message ?? `Không thể đọc: ${file.name}`));
    r.readAsDataURL(file);
  });
}

async function processRawEntries(entries: { path: string; file: File }[]): Promise<RepoFile[]> {
  const MAX = 5 * 1024 * 1024;
  const out: RepoFile[] = [];
  const errors: string[] = [];
  for (const { path, file } of entries) {
    if (file.size > MAX) { errors.push(`"${path}" > 5MB`); continue; }
    try {
      const content = await toBase64(file);
      out.push({ id: crypto.randomUUID(), name: path, content, size: file.size, type: file.type || 'application/octet-stream' });
    } catch (err) {
      errors.push(`"${path}": ${err instanceof Error ? err.message : 'Lỗi đọc file'}`);
    }
  }
  if (errors.length > 0) alert(`Bỏ qua ${errors.length} file:\n` + errors.slice(0, 5).join('\n'));
  return out;
}
// ─────────────────────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (f: RepoFile[]) => void }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDrag(false);
    setLoading(true);
    try {
      const items = Array.from(e.dataTransfer.items).filter(i => i.kind === 'file');
      const allEntries: { path: string; file: File }[] = [];
      for (const item of items) {
        try {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            allEntries.push(...await traverseEntry(entry));
          } else {
            const file = item.getAsFile();
            if (file) allEntries.push({ path: file.name, file });
          }
        } catch { /* bỏ qua */ }
      }
      if (allEntries.length > 0) onFiles(await processRawEntries(allEntries));
    } finally {
      setLoading(false);
    }
  }

  async function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files;
    e.target.value = '';
    if (!raw || raw.length === 0) return;
    setLoading(true);
    try {
      const entries = Array.from(raw).map(f => ({
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        file: f,
      }));
      onFiles(await processRawEntries(entries));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onDragEnter={e => { e.preventDefault(); dragCounter.current++; setDrag(true); }}
      onDragLeave={e => { e.preventDefault(); if (--dragCounter.current === 0) setDrag(false); }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        border: `1.5px dashed ${drag ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 6, padding: '10px', textAlign: 'center',
        background: drag ? 'var(--blue-dim)' : 'transparent', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--text2)',
      }}
    >
      {loading ? (
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
      ) : (
        <>
          <Upload size={13} />
          <span>
            Kéo thả file/folder hoặc{' '}
            <span style={{ color: 'var(--blue-bright)', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>chọn file</span>
            {' '}·{' '}
            <span style={{ color: 'var(--blue-bright)', cursor: 'pointer' }} onClick={() => folderRef.current?.click()}>chọn folder</span>
          </span>
        </>
      )}
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleInput} />
      <input ref={folderRef} type="file" multiple
        // @ts-expect-error webkitdirectory không có trong typing chuẩn
        webkitdirectory=""
        style={{ display: 'none' }} onChange={handleInput} />
    </div>
  );
}

function FileList({ files, onRemove }: { files: RepoFile[]; onRemove: (id: string) => void }) {
  if (files.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {files.map(f => (
        <div key={f.id} className="file-chip">
          <span style={{ color: 'var(--text3)' }}>{fileIcon(f.type)}</span>
          <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{f.name}</span>
          <span style={{ color: 'var(--text3)', fontSize: 10 }}>({formatBytes(f.size)})</span>
          <button onClick={() => onRemove(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex', marginLeft: 2 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function PerRepoFileManager({ repos, onChange, sharedFiles, onSharedChange }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sharedOpen, setSharedOpen] = useState(true);

  function toggle(i: number) {
    setExpanded(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function addFilesToRepo(idx: number, newFiles: RepoFile[]) {
    onChange(repos.map((r, i) => {
      if (i !== idx) return r;
      const merged = [...r.files];
      for (const f of newFiles) { if (!merged.find(x => x.name === f.name)) merged.push(f); }
      return { ...r, files: merged };
    }));
  }

  function removeFileFromRepo(repoIdx: number, fileId: string) {
    onChange(repos.map((r, i) => i !== repoIdx ? r : { ...r, files: r.files.filter(f => f.id !== fileId) }));
  }

  function copySharedToAll() {
    if (sharedFiles.length === 0) return;
    onChange(repos.map(r => {
      const merged = [...r.files];
      for (const f of sharedFiles) { if (!merged.find(x => x.name === f.name)) merged.push({ ...f, id: crypto.randomUUID() }); }
      return { ...r, files: merged };
    }));
  }

  function copySharedToRepo(idx: number) {
    addFilesToRepo(idx, sharedFiles.map(f => ({ ...f, id: crypto.randomUUID() })));
  }

  function clearAllFiles() {
    onChange(repos.map(r => ({ ...r, files: [] })));
  }

  function addSharedFiles(newFiles: RepoFile[]) {
    const merged = [...sharedFiles];
    for (const f of newFiles) { if (!merged.find(x => x.name === f.name)) merged.push(f); }
    onSharedChange(merged);
  }

  const totalFiles = repos.reduce((s, r) => s + r.files.length, 0) + sharedFiles.length;

  return (
    <div className="card">
      <div className="card-header">
        <FolderOpen size={15} style={{ color: 'var(--text2)' }} />
        <span className="card-title">Files đính kèm</span>
        {totalFiles > 0 && <span className="badge badge-gray">{totalFiles} file</span>}
        {totalFiles > 0 && (
          <button onClick={clearAllFiles} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px', marginLeft: 'auto' }}>
            <Trash2 size={11} /> Xoá tất cả
          </button>
        )}
      </div>

      {/* Shared files */}
      <div style={{ marginBottom: 8, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div onClick={() => setSharedOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ color: 'var(--text3)' }}>{sharedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>📁 Dùng chung — push vào TẤT CẢ repo</span>
          {sharedFiles.length > 0 && <span style={{ fontSize: 11, color: 'var(--green)' }}>{sharedFiles.length} file</span>}
          {sharedFiles.length > 0 && repos.length > 0 && (
            <button onClick={e => { e.stopPropagation(); copySharedToAll(); }} className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 7px' }}>
              <Copy size={10} /> Copy vào từng repo
            </button>
          )}
        </div>
        {sharedOpen && (
          <div style={{ padding: '0 12px 10px' }}>
            <DropZone onFiles={addSharedFiles} />
            <FileList files={sharedFiles} onRemove={id => onSharedChange(sharedFiles.filter(f => f.id !== id))} />
          </div>
        )}
      </div>

      {/* Per-repo files */}
      {repos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text3)', fontSize: 12 }}>
          Nhập tên repo bên trên để gắn file riêng cho từng repo
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {repos.map((repo, i) => {
            const open = expanded.has(i);
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <div onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', userSelect: 'none', background: open ? 'var(--surface2)' : 'transparent' }}>
                  <span style={{ color: 'var(--text3)' }}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--blue-bright)' }}>{repo.name}</span>
                  {repo.files.length > 0
                    ? <span style={{ fontSize: 11, color: 'var(--green)' }}>{repo.files.length} file riêng</span>
                    : <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sharedFiles.length > 0 ? `dùng ${sharedFiles.length} file chung` : 'chưa có file'}</span>
                  }
                  {sharedFiles.length > 0 && (
                    <button onClick={e => { e.stopPropagation(); copySharedToRepo(i); }} className="btn btn-ghost" style={{ fontSize: 10, padding: '1px 5px' }}>
                      <Copy size={9} /> copy chung
                    </button>
                  )}
                </div>
                {open && (
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                    <DropZone onFiles={f => addFilesToRepo(i, f)} />
                    <FileList files={repo.files} onRemove={id => removeFileFromRepo(i, id)} />
                    {repo.files.length === 0 && sharedFiles.length > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Sẽ dùng {sharedFiles.length} file chung. Thêm file riêng sẽ cộng thêm vào.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}