'use client';
import { useState, useRef } from 'react';
import { Upload, X, File, FileCode, FileText, Image } from 'lucide-react';
import { RepoFile } from '@/app/types';

interface Props {
  files: RepoFile[];
  onChange: (files: RepoFile[]) => void;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={14} />;
  if (type.includes('javascript') || type.includes('typescript') || type.includes('python') || type.includes('html') || type.includes('css') || type.includes('json'))
    return <FileCode size={14} />;
  if (type.includes('text')) return <FileText size={14} />;
  return <File size={14} />;
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export default function FileUploader({ files, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFiles(rawFiles: FileList | null) {
    if (!rawFiles) return;
    const MAX = 5 * 1024 * 1024; // 5MB per file
    const newFiles: RepoFile[] = [];
    for (const f of Array.from(rawFiles)) {
      if (f.size > MAX) { alert(`File "${f.name}" quá lớn (>5MB).`); continue; }
      const content = await toBase64(f);
      newFiles.push({ id: crypto.randomUUID(), name: f.name, content, size: f.size, type: f.type });
    }
    const merged = [...files];
    for (const nf of newFiles) {
      if (!merged.find(x => x.name === nf.name)) merged.push(nf);
    }
    onChange(merged);
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function remove(id: string) { onChange(files.filter(f => f.id !== id)); }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
          borderRadius: 6,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(31,111,235,0.05)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={24} style={{ color: 'var(--muted)', margin: '0 auto 8px' }} />
        <p style={{ color: 'var(--text)', fontSize: 13 }}>Kéo thả hoặc <span style={{ color: 'var(--blue)' }}>chọn file</span></p>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Tất cả các loại file · tối đa 5MB/file</p>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => processFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface2)', borderRadius: 6, padding: '6px 10px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ color: 'var(--muted)' }}>{fileIcon(f.type)}</span>
              <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>{formatBytes(f.size)}</span>
              <button onClick={() => remove(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2 }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
