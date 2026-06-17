'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, FileCode, FileText, Image, Folder } from 'lucide-react';
import { RepoFile } from '@/app/types';

interface Props {
  files: RepoFile[];
  onChange: (files: RepoFile[]) => void;
}

function fileIcon(name: string, type: string) {
  if (type.startsWith('image/')) return <Image size={14} />;
  if (
    type.includes('javascript') || type.includes('typescript') ||
    type.includes('python') || type.includes('html') ||
    type.includes('css') || type.includes('json') ||
    /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|cs|php|rb|swift|kt)$/i.test(name)
  ) return <FileCode size={14} />;
  if (type.includes('text') || /\.(md|txt|yaml|yml|toml|env)$/i.test(name))
    return <FileText size={14} />;
  return <File size={14} />;
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    if (file.size === 0) { res(btoa('\n')); return; }
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      res(base64 ?? '');
    };
    r.onerror = () => {
      // Lấy message từ FileReader error, không cast ProgressEvent trực tiếp
      const msg = r.error?.message ?? `Không thể đọc file: ${file.name}`;
      rej(new Error(msg));
    };
    r.readAsDataURL(file);
  });
}

// Đọc tất cả entries từ một DirectoryReader (loop vì mỗi lần chỉ trả ≤100)
function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise(resolve => {  // chỉ resolve, không bao giờ reject
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        entries => {
          if (entries.length === 0) {
            resolve(all);
          } else {
            all.push(...entries);
            readBatch();
          }
        },
        () => resolve(all) // lỗi → trả những gì đọc được, không throw
      );
    };
    readBatch();
  });
}

// Lấy File object từ FileSystemFileEntry
function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise(resolve => {
    entry.file(
      file => resolve(file),
      () => resolve(null) // lỗi → bỏ qua file này
    );
  });
}

// Traverse đệ quy FileSystemEntry → { path, file }[]
async function traverseEntry(
  entry: FileSystemEntry,
  pathPrefix = ''
): Promise<{ path: string; file: File }[]> {
  try {
    if (entry.isFile) {
      const file = await getFileFromEntry(entry as FileSystemFileEntry);
      if (!file) return [];
      return [{ path: pathPrefix + entry.name, file }];
    }

    if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const children = await readAllEntries(reader);
      const results: { path: string; file: File }[] = [];
      for (const child of children) {
        const sub = await traverseEntry(child, pathPrefix + entry.name + '/');
        results.push(...sub);
      }
      return results;
    }
  } catch {
    // bỏ qua entry lỗi, không crash toàn bộ
  }
  return [];
}

export default function FileUploader({ files, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0); // counter để tránh flicker khi drag qua child elements

  const mergeIntoExisting = useCallback(
    (newFiles: RepoFile[]) => {
      const merged = [...files];
      for (const nf of newFiles) {
        const idx = merged.findIndex(x => x.name === nf.name);
        if (idx === -1) merged.push(nf);
        else merged[idx] = nf;
      }
      onChange(merged);
    },
    [files, onChange]
  );
  // Xử lý danh sách { path, file } → RepoFile[]
  async function processEntries(entries: { path: string; file: File }[]) {
    const MAX = 5 * 1024 * 1024;
    const result: RepoFile[] = [];
    const errors: string[] = [];
    let i = 0;
    for (const { path, file } of entries) {
      i++;
      setLoadingMsg(`Đang đọc ${i}/${entries.length}: ${path.split('/').pop()}`);
      if (file.size > MAX) {
        errors.push(`"${path}" quá lớn (>5MB)`);
        continue;
      }
      try {
        const content = await toBase64(file);
        result.push({
          id: crypto.randomUUID(),
          name: path,
          content,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
      } catch (err) {
        // Ép về string an toàn, tránh [object ProgressEvent]
        const msg = err instanceof Error ? err.message : `Lỗi đọc file: ${path}`;
        errors.push(`"${path}": ${msg}`);
      }
    }
    if (errors.length > 0) {
      alert(`Bỏ qua ${errors.length} file:\n` + errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...và ${errors.length - 5} file khác` : ''));
    }
    return result;
  }

  // Xử lý input[file] hoặc input[webkitdirectory]
  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = e.target.files;
    e.target.value = ''; // reset để chọn lại cùng file được
    if (!rawFiles || rawFiles.length === 0) return;
    setLoading(true);
    try {
      const entries = Array.from(rawFiles).map(f => ({
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        file: f,
      }));
      const result = await processEntries(entries);
      mergeIntoExisting(result);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  // Drag events — dùng counter để tránh flicker
  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); // bắt buộc để drop hoạt động
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    setLoading(true);

    try {
      // Phải copy items TRƯỚC khi await — dataTransfer bị clear sau khi event kết thúc
      const items = Array.from(e.dataTransfer.items).filter(i => i.kind === 'file');
      const allEntries: { path: string; file: File }[] = [];

      for (const item of items) {
        try {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            setLoadingMsg('Đang quét thư mục...');
            const sub = await traverseEntry(entry);
            allEntries.push(...sub);
          } else {
            const file = item.getAsFile();
            if (file) allEntries.push({ path: file.name, file });
          }
        } catch {
          // bỏ qua item lỗi
        }
      }

      if (allEntries.length === 0) {
        setLoading(false);
        setLoadingMsg('');
        return;
      }

      const result = await processEntries(allEntries);
      mergeIntoExisting(result);
    } catch (err) {
      console.error('Drop error:', err);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  function remove(id: string) {
    onChange(files.filter(f => f.id !== id));
  }

  // Nhóm files theo folder để hiển thị
  const grouped = files.reduce<Record<string, RepoFile[]>>((acc, f) => {
    const parts = f.name.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    (acc[dir] = acc[dir] || []).push(f);
    return acc;
  }, {});
  const sortedDirs = Object.keys(grouped).sort();
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
          borderRadius: 8,
          padding: '28px 16px 20px',
          textAlign: 'center',
          background: dragging ? 'rgba(31,111,235,0.07)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, minHeight: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 20 }}>⟳</span>
            <span>{loadingMsg || 'Đang xử lý...'}</span>
          </div>
        ) : (
          <>
            <Upload size={26} style={{ color: dragging ? 'var(--blue)' : 'var(--muted)', margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--text)', fontSize: 13, marginBottom: 4 }}>
              {dragging
                ? <strong style={{ color: 'var(--blue)' }}>Thả vào đây!</strong>
                : <>Kéo thả <strong>file</strong> hoặc <strong>folder</strong> vào đây</>
              }
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
              Hỗ trợ folder lồng nhau · tối đa 5MB/file
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 6, fontSize: 13,
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  color: 'var(--text)', cursor: 'pointer',
                }}
              >
                <File size={14} /> Chọn File
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 6, fontSize: 13,
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  color: 'var(--text)', cursor: 'pointer',
                }}
              >
                <Folder size={14} /> Chọn Folder
              </button>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory không có trong typing chuẩn
          webkitdirectory=""
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>

      {/* Danh sách file */}
      {files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>{files.length} file</span>
            <span>{formatBytes(totalSize)} tổng</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {sortedDirs.map(dir => (
              <div key={dir || '__root__'}>
                {dir && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: 'var(--muted)',
                    padding: '6px 0 2px',
                    marginTop: 4,
                    borderTop: '1px solid var(--border)',
                  }}>
                    <Folder size={12} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace' }}>{dir}/</span>
                  </div>
                )}
                {grouped[dir].map(f => {
                  const displayName = f.name.split('/').pop() ?? f.name;
                  return (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--surface2)', borderRadius: 6,
                      padding: '5px 10px',
                      border: '1px solid var(--border)',
                      marginLeft: dir ? 14 : 0,
                    }}>
                      <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{fileIcon(f.name, f.type)}</span>
                      <span
                        style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}
                        title={f.name}
                      >
                        {displayName}
                      </span>
                      <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>{formatBytes(f.size)}</span>
                      <button
                        onClick={() => remove(f.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}