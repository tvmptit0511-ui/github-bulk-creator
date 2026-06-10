'use client';
import { useState, useRef, useCallback } from 'react';
import {
  Upload, X, File, FileCode, FileText, Image as ImageIcon,
  FilePlus, RefreshCw, CheckCircle, XCircle, Loader, Clock,
  AlertTriangle, ChevronDown, ChevronUp, FolderSync,
} from 'lucide-react';
import { RepoFile } from '@/app/types';
import { upsertFile, replaceAllRepoFiles } from '@/app/lib/github';

interface Props {
  token: string;
  owner: string;
  selectedRepos: string[];
}

type Mode = 'add' | 'replace';
type ItemStatus = 'pending' | 'running' | 'ok' | 'error';

interface LogItem {
  repo: string;
  status: ItemStatus;
  message: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon size={13} />;
  if (['javascript','typescript','python','html','css','json'].some(t => type.includes(t)))
    return <FileCode size={13} />;
  if (type.includes('text')) return <FileText size={13} />;
  return <File size={13} />;
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ── DropZone ─────────────────────────────────────────────────────────────────

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
    if (out.length) onFiles(out);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '20px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'rgba(61,126,255,0.06)' : 'var(--bg2)',
        transition: 'all 0.15s',
      }}
    >
      <Upload size={22} style={{ color: 'var(--text3)', margin: '0 auto 8px' }} />
      <p style={{ color: 'var(--text2)', fontSize: 13 }}>
        Kéo thả hoặc <span style={{ color: 'var(--accent)' }}>chọn file</span>
      </p>
      <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 3 }}>
        Tất cả loại file · tối đa 5 MB/file
      </p>
      <input ref={ref} type="file" multiple style={{ display: 'none' }} onChange={e => process(e.target.files)} />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function RepoFileUpdater({ token, owner, selectedRepos }: Props) {
  const [mode, setMode] = useState<Mode>('add');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [okCount, setOkCount] = useState(0);
  const [errCount, setErrCount] = useState(0);
  const [confirmReplace, setConfirmReplace] = useState(false);

  function addFiles(newFiles: RepoFile[]) {
    setFiles(prev => {
      const merged = [...prev];
      for (const f of newFiles) {
        const idx = merged.findIndex(x => x.name === f.name);
        if (idx === -1) merged.push(f);
        else merged[idx] = f; // overwrite same name
      }
      return merged;
    });
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function updateLog(repo: string, partial: Partial<LogItem>) {
    setLogs(prev => prev.map(l => l.repo === repo ? { ...l, ...partial } : l));
  }

  const execute = useCallback(async () => {
    if (files.length === 0 || selectedRepos.length === 0) return;
    if (mode === 'replace' && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    setRunning(true);
    setConfirmReplace(false);
    setOkCount(0);
    setErrCount(0);
    setShowLogs(true);
    setLogs(selectedRepos.map(r => ({ repo: r, status: 'pending', message: 'Chờ...' })));

    let ok = 0, err = 0;

    for (const repo of selectedRepos) {
      updateLog(repo, { status: 'running', message: 'Đang xử lý...' });
      try {
        if (mode === 'add') {
          // Upload/overwrite each file one by one
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            updateLog(repo, { message: `Upload ${f.name} (${i + 1}/${files.length})...` });
            await upsertFile(token, owner, repo, f);
          }
          updateLog(repo, { status: 'ok', message: `✓ Đã thêm ${files.length} file` });
        } else {
          // Replace all: delete then re-upload
          await replaceAllRepoFiles(token, owner, repo, files, undefined, msg => {
            updateLog(repo, { message: msg });
          });
          updateLog(repo, { status: 'ok', message: `✓ Đã thay thế bằng ${files.length} file mới` });
        }
        ok++;
        setOkCount(ok);
      } catch (e) {
        const msg = (e as Error).message;
        updateLog(repo, { status: 'error', message: msg });
        err++;
        setErrCount(err);
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 400));
    }

    setRunning(false);
  }, [files, selectedRepos, mode, confirmReplace, token, owner]);

  const done = okCount + errCount;
  const pct = selectedRepos.length > 0 ? Math.round((done / selectedRepos.length) * 100) : 0;
  const canRun = files.length > 0 && selectedRepos.length > 0 && !running;

  return (
    <div className="card" style={{ marginTop: 12, border: '1px solid rgba(61,126,255,0.2)', background: 'rgba(61,126,255,0.03)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <FolderSync size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          Cập nhật file repo
        </span>
        {selectedRepos.length > 0 && (
          <span style={{
            padding: '2px 10px',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(61,126,255,0.2)',
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent)',
          }}>
            {selectedRepos.length} repo đang chọn
          </span>
        )}
      </div>

      {selectedRepos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
          ← Chọn repo ở danh sách bên trái để cập nhật file
        </div>
      ) : (
        <>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {/* Add mode */}
            <button
              onClick={() => { setMode('add'); setConfirmReplace(false); }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1.5px solid ${mode === 'add' ? 'var(--accent)' : 'var(--border)'}`,
                background: mode === 'add' ? 'var(--accent-dim)' : 'var(--surface2)',
                color: mode === 'add' ? 'var(--accent)' : 'var(--text2)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3,
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
                <FilePlus size={14} />
                Thêm / Cập nhật file
              </span>
              <span style={{ fontSize: 11, opacity: 0.75 }}>
                Upload file mới, ghi đè nếu đã tồn tại. File cũ không bị xoá.
              </span>
            </button>

            {/* Replace mode */}
            <button
              onClick={() => { setMode('replace'); setConfirmReplace(false); }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1.5px solid ${mode === 'replace' ? 'rgba(255,77,106,0.5)' : 'var(--border)'}`,
                background: mode === 'replace' ? 'rgba(255,77,106,0.08)' : 'var(--surface2)',
                color: mode === 'replace' ? 'var(--red)' : 'var(--text2)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3,
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
                <RefreshCw size={14} />
                Thay thế hoàn toàn
              </span>
              <span style={{ fontSize: 11, opacity: 0.75 }}>
                Xoá toàn bộ file cũ, upload file mới. Không thể hoàn tác.
              </span>
            </button>
          </div>

          {/* Warning banner for replace mode */}
          {mode === 'replace' && (
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              padding: '10px 12px',
              background: 'rgba(255,77,106,0.08)',
              border: '1px solid rgba(255,77,106,0.25)',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 12,
              color: 'var(--red)',
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Chế độ này sẽ <strong>xoá toàn bộ file ở root</strong> của repo rồi upload file mới.
                README, code cũ, v.v. sẽ bị mất vĩnh viễn.
              </span>
            </div>
          )}

          {/* File upload area */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ marginBottom: 8, display: 'block' }}>
              {mode === 'add' ? 'File sẽ được thêm / ghi đè' : 'File sẽ thay thế toàn bộ nội dung'}
            </label>
            <DropZone onFiles={addFiles} />

            {files.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {files.map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--surface2)', borderRadius: 7,
                    padding: '6px 10px', border: '1px solid var(--border)',
                  }}>
                    <span style={{ color: 'var(--text3)' }}>{fileIcon(f.type)}</span>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    <span style={{ color: 'var(--text3)', fontSize: 11, flexShrink: 0 }}>
                      {formatBytes(f.size)}
                    </span>
                    <button
                      onClick={() => removeFile(f.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 2, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {files.length} file đã chọn
                  <button
                    onClick={() => setFiles([])}
                    style={{ marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, textDecoration: 'underline' }}
                  >
                    Xoá tất cả
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Confirm panel (replace mode) */}
          {confirmReplace && (
            <div style={{
              padding: '12px',
              background: 'rgba(255,77,106,0.12)',
              border: '1px solid rgba(255,77,106,0.3)',
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 13,
            }}>
              <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>
                Xác nhận thay thế toàn bộ file trong {selectedRepos.length} repo?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={execute}
                  style={{
                    background: 'var(--red)', border: 'none', borderRadius: 6,
                    color: '#fff', cursor: 'pointer', padding: '6px 16px',
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  Xác nhận
                </button>
                <button className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setConfirmReplace(false)}>
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Action button */}
          {!confirmReplace && (
            <button
              onClick={execute}
              disabled={!canRun}
              style={{
                width: '100%',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                borderRadius: 8,
                border: 'none',
                cursor: canRun ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
                ...(mode === 'add'
                  ? {
                      background: canRun ? 'linear-gradient(135deg, #2d6be0, #3d7eff)' : 'rgba(61,126,255,0.3)',
                      color: '#fff',
                      boxShadow: canRun ? '0 2px 12px rgba(61,126,255,0.25)' : 'none',
                    }
                  : {
                      background: canRun ? 'var(--red)' : 'rgba(255,77,106,0.3)',
                      color: canRun ? '#fff' : 'rgba(255,255,255,0.4)',
                    }
                ),
              }}
            >
              {running ? (
                <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang xử lý...</>
              ) : mode === 'add' ? (
                <><FilePlus size={14} /> Thêm file vào {selectedRepos.length} repo</>
              ) : (
                <><RefreshCw size={14} /> Thay thế file trong {selectedRepos.length} repo</>
              )}
            </button>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}
                onClick={() => setShowLogs(v => !v)}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {running ? '⏳ Đang xử lý...' : '📋 Kết quả'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ {okCount}</span>
                {errCount > 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>✗ {errCount}</span>}
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{done}/{selectedRepos.length}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>
                  {showLogs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: errCount > 0 ? 'linear-gradient(90deg, var(--accent), var(--red))' : 'linear-gradient(90deg, var(--accent), var(--green))',
                  borderRadius: 2,
                  width: `${pct}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>

              {showLogs && (
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {logs.map(log => (
                    <div key={log.repo} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 8px', borderRadius: 6, fontSize: 12,
                      fontFamily: 'monospace',
                      background: log.status === 'running' ? 'rgba(61,126,255,0.06)' : 'transparent',
                    }}>
                      <span style={{ flexShrink: 0, color: log.status === 'ok' ? 'var(--green)' : log.status === 'error' ? 'var(--red)' : log.status === 'running' ? 'var(--accent)' : 'var(--text3)' }}>
                        {log.status === 'ok' && <CheckCircle size={12} />}
                        {log.status === 'error' && <XCircle size={12} />}
                        {log.status === 'running' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                        {log.status === 'pending' && <Clock size={12} />}
                      </span>
                      <span style={{ color: '#79c0ff', flexShrink: 0, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.repo}
                      </span>
                      <span style={{ color: 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}