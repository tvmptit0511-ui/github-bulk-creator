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
  if (['javascript','typescript','python','html','css','json'].some(t => type.includes(t))) return <FileCode size={12} />;
  if (type.includes('text')) return <FileText size={12} />;
  return <File size={12} />;
}

function formatBytes(b: number) {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(0) + 'KB';
  return (b / 1048576).toFixed(1) + 'MB';
}

function DropZone({ onFiles }: { onFiles: (f: RepoFile[]) => void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function process(raw: FileList | null) {
    if (!raw) return;
    const out: RepoFile[] = [];
    for (const f of Array.from(raw)) {
      if (f.size > 5 * 1024 * 1024) { alert(`"${f.name}" > 5MB, bỏ qua.`); continue; }
      const content = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      out.push({ id: crypto.randomUUID(), name: f.name, content, size: f.size, type: f.type });
    }
    onFiles(out);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      style={{
        border: `1.5px dashed ${drag ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 5,
        padding: '10px',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'rgba(31,111,235,0.06)' : 'transparent',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--muted)',
      }}
    >
      <Upload size={13} />
      <span>Kéo thả hoặc <span style={{ color: 'var(--blue)' }}>chọn file</span></span>
      <input ref={ref} type="file" multiple style={{ display: 'none' }} onChange={e => process(e.target.files)} />
    </div>
  );
}

function FileList({ files, onRemove }: { files: RepoFile[]; onRemove: (id: string) => void }) {
  if (files.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {files.map(f => (
        <div key={f.id} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '2px 6px', fontSize: 11,
        }}>
          <span style={{ color: 'var(--muted)' }}>{fileIcon(f.type)}</span>
          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
          <span style={{ color: 'var(--muted)' }}>({formatBytes(f.size)})</span>
          <button onClick={() => onRemove(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex', marginLeft: 2 }}>
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
    const updated = repos.map((r, i) => {
      if (i !== idx) return r;
      const merged = [...r.files];
      for (const f of newFiles) {
        if (!merged.find(x => x.name === f.name)) merged.push(f);
      }
      return { ...r, files: merged };
    });
    onChange(updated);
  }

  function removeFileFromRepo(repoIdx: number, fileId: string) {
    onChange(repos.map((r, i) => i !== repoIdx ? r : { ...r, files: r.files.filter(f => f.id !== fileId) }));
  }

  function copySharedToAll() {
    if (sharedFiles.length === 0) return;
    onChange(repos.map(r => {
      const merged = [...r.files];
      for (const f of sharedFiles) {
        if (!merged.find(x => x.name === f.name)) merged.push({ ...f, id: crypto.randomUUID() });
      }
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
    for (const f of newFiles) {
      if (!merged.find(x => x.name === f.name)) merged.push(f);
    }
    onSharedChange(merged);
  }

  const totalFiles = repos.reduce((s, r) => s + r.files.length, 0) + sharedFiles.length;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <FolderOpen size={15} style={{ color: 'var(--muted)' }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>Files đính kèm</span>
        {totalFiles > 0 && (
          <span style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px', color: 'var(--muted)' }}>
            {totalFiles} file
          </span>
        )}
        {totalFiles > 0 && (
          <button onClick={clearAllFiles} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Trash2 size={11} /> Xoá tất cả
          </button>
        )}
      </div>

      {/* Shared files section */}
      <div style={{ marginBottom: 10, background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div
          onClick={() => setSharedOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ color: 'var(--muted)' }}>{sharedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>📁 Dùng chung — push vào TẤT CẢ repo</span>
          {sharedFiles.length > 0 && (
            <span style={{ fontSize: 11, color: '#2ea043' }}>{sharedFiles.length} file</span>
          )}
          {sharedFiles.length > 0 && repos.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); copySharedToAll(); }}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px' }}
              title="Copy file dùng chung vào từng repo riêng"
            >
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
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 12 }}>
          Nhập tên repo bên trên để gắn file riêng cho từng repo
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {repos.map((repo, i) => {
            const open = expanded.has(i);
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  onClick={() => toggle(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', userSelect: 'none', background: open ? 'var(--surface2)' : 'transparent' }}
                >
                  <span style={{ color: 'var(--muted)' }}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#79c0ff' }}>
                    {repo.name}
                  </span>
                  {repo.files.length > 0
                    ? <span style={{ fontSize: 11, color: '#2ea043' }}>{repo.files.length} file riêng</span>
                    : <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {sharedFiles.length > 0 ? `dùng ${sharedFiles.length} file chung` : 'chưa có file'}
                      </span>
                  }
                  {sharedFiles.length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); copySharedToRepo(i); }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--muted)', fontSize: 10, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}
                      title="Copy file dùng chung vào repo này"
                    >
                      <Copy size={9} /> copy chung
                    </button>
                  )}
                </div>
                {open && (
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                    <DropZone onFiles={f => addFilesToRepo(i, f)} />
                    <FileList files={repo.files} onRemove={id => removeFileFromRepo(i, id)} />
                    {repo.files.length === 0 && sharedFiles.length > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                        Sẽ dùng {sharedFiles.length} file chung. Thêm file riêng sẽ <strong>cộng thêm</strong> vào file chung.
                      </p>
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
