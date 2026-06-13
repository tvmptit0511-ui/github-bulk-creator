'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, FileCode, FileText, Image as ImageIcon, FilePlus, RefreshCw, CheckCircle, XCircle, Loader, Clock, AlertTriangle, ChevronDown, ChevronUp, FolderSync } from 'lucide-react';
import { RepoFile } from '@/app/types';
import { upsertFile, replaceAllRepoFiles } from '@/app/lib/github';

interface Props {
  token: string;
  owner: string;
  selectedRepos: string[];
}

type Mode = 'add' | 'replace';
type ItemStatus = 'pending' | 'running' | 'ok' | 'error';

interface LogItem { repo: string; status: ItemStatus; message: string; }

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon size={13} />;
  if (['javascript', 'typescript', 'python', 'html', 'css', 'json'].some(t => type.includes(t))) return <FileCode size={13} />;
  if (type.includes('text')) return <FileText size={13} />;
  return <File size={13} />;
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
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
    if (out.length) onFiles(out);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      style={{ border: `2px dashed ${drag ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 8, padding: '18px 16px', textAlign: 'center', cursor: 'pointer', background: drag ? 'var(--blue-dim)' : 'var(--bg2)', transition: 'all 0.15s' }}
    >
      <Upload size={20} style={{ color: 'var(--text3)', margin: '0 auto 6px' }} />
      <p style={{ color: 'var(--text2)', fontSize: 13 }}>Kéo thả hoặc <span style={{ color: 'var(--blue-bright)' }}>chọn file</span></p>
      <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>Tất cả loại file · tối đa 5 MB/file</p>
      <input ref={ref} type="file" multiple style={{ display: 'none' }} onChange={e => process(e.target.files)} />
    </div>
  );
}

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
        else merged[idx] = f;
      }
      return merged;
    });
  }

  function updateLog(repo: string, partial: Partial<LogItem>) {
    setLogs(prev => prev.map(l => l.repo === repo ? { ...l, ...partial } : l));
  }

  const execute = useCallback(async () => {
    if (files.length === 0 || selectedRepos.length === 0) return;
    if (mode === 'replace' && !confirmReplace) { setConfirmReplace(true); return; }
    setRunning(true); setConfirmReplace(false); setOkCount(0); setErrCount(0); setShowLogs(true);
    setLogs(selectedRepos.map(r => ({ repo: r, status: 'pending', message: 'Chờ...' })));
    let ok = 0, err = 0;
    for (const repo of selectedRepos) {
      updateLog(repo, { status: 'running', message: 'Đang xử lý...' });
      try {
        if (mode === 'add') {
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            updateLog(repo, { message: `Upload ${f.name} (${i + 1}/${files.length})...` });
            await upsertFile(token, owner, repo, f);
          }
          updateLog(repo, { status: 'ok', message: `✓ Đã thêm ${files.length} file` });
        } else {
          await replaceAllRepoFiles(token, owner, repo, files, undefined, msg => updateLog(repo, { message: msg }));
          updateLog(repo, { status: 'ok', message: `✓ Đã thay thế bằng ${files.length} file mới` });
        }
        ok++; setOkCount(ok);
      } catch (e) {
        updateLog(repo, { status: 'error', message: (e as Error).message });
        err++; setErrCount(err);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    setRunning(false);
  }, [files, selectedRepos, mode, confirmReplace, token, owner]);

  const done = okCount + errCount;
  const pct = selectedRepos.length > 0 ? Math.round((done / selectedRepos.length) * 100) : 0;
  const canRun = files.length > 0 && selectedRepos.length > 0 && !running;

  return (
    <div className="card" style={{ marginTop: 10, borderColor: 'rgba(31,111,235,0.2)', background: 'rgba(31,111,235,0.02)' }}>
      <div className="card-header">
        <FolderSync size={15} style={{ color: 'var(--blue-bright)' }} />
        <span className="card-title">Cập nhật file repo</span>
        {selectedRepos.length > 0 && <span className="badge badge-blue">{selectedRepos.length} repo</span>}
      </div>

      {selectedRepos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--text3)', fontSize: 13 }}>
          ← Chọn repo ở danh sách bên trái để cập nhật file
        </div>
      ) : (
        <>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => { setMode('add'); setConfirmReplace(false); }} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${mode === 'add' ? 'var(--blue)' : 'var(--border)'}`, background: mode === 'add' ? 'var(--blue-dim)' : 'var(--surface2)', color: mode === 'add' ? 'var(--blue-bright)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 12 }}><FilePlus size={13} /> Thêm / Cập nhật file</span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>Upload file mới, ghi đè nếu đã tồn tại.</span>
            </button>
            <button onClick={() => { setMode('replace'); setConfirmReplace(false); }} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${mode === 'replace' ? 'rgba(248,81,73,0.5)' : 'var(--border)'}`, background: mode === 'replace' ? 'var(--red-dim)' : 'var(--surface2)', color: mode === 'replace' ? 'var(--red)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 12 }}><RefreshCw size={13} /> Thay thế hoàn toàn</span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>Xoá toàn bộ file cũ, upload file mới.</span>
            </button>
          </div>

          {mode === 'replace' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 12px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Chế độ này sẽ <strong>xoá toàn bộ file ở root</strong> của repo rồi upload file mới.</span>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ marginBottom: 6 }}>{mode === 'add' ? 'File sẽ được thêm / ghi đè' : 'File sẽ thay thế toàn bộ nội dung'}</label>
            <DropZone onFiles={addFiles} />
            {files.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {files.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 6, padding: '5px 10px', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text3)' }}>{fileIcon(f.type)}</span>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: 'var(--blue-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>{formatBytes(f.size)}</span>
                    <button onClick={() => setFiles(p => p.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 2 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {files.length} file đã chọn
                  <button onClick={() => setFiles([])} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11, textDecoration: 'underline' }}>Xoá tất cả</button>
                </div>
              </div>
            )}
          </div>

          {confirmReplace && (
            <div style={{ padding: '12px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, marginBottom: 10, fontSize: 13 }}>
              <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Xác nhận thay thế toàn bộ file trong {selectedRepos.length} repo?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={execute} style={{ background: 'var(--red)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Xác nhận</button>
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setConfirmReplace(false)}>Huỷ</button>
              </div>
            </div>
          )}

          {!confirmReplace && (
            <button onClick={execute} disabled={!canRun} className={`btn ${mode === 'add' ? 'btn-primary' : 'btn-danger'}`} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13 }}>
              {running ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang xử lý...</>
                : mode === 'add' ? <><FilePlus size={13} /> Thêm file vào {selectedRepos.length} repo</>
                : <><RefreshCw size={13} /> Thay thế file trong {selectedRepos.length} repo</>}
            </button>
          )}

          {logs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }} onClick={() => setShowLogs(v => !v)}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{running ? '⏳ Đang xử lý...' : '📋 Kết quả'}</span>
                <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ {okCount}</span>
                {errCount > 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>✗ {errCount}</span>}
                <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>{showLogs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
              </div>
              <div className="progress-track" style={{ marginBottom: 6 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              {showLogs && (
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {logs.map(log => (
                    <div key={log.repo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', background: log.status === 'running' ? 'rgba(31,111,235,0.06)' : 'transparent' }}>
                      <span style={{ flexShrink: 0, color: log.status === 'ok' ? 'var(--green)' : log.status === 'error' ? 'var(--red)' : log.status === 'running' ? 'var(--blue-bright)' : 'var(--text3)' }}>
                        {log.status === 'ok' && <CheckCircle size={12} />}
                        {log.status === 'error' && <XCircle size={12} />}
                        {log.status === 'running' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                        {log.status === 'pending' && <Clock size={12} />}
                      </span>
                      <span style={{ color: 'var(--blue-bright)', flexShrink: 0, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.repo}</span>
                      <span style={{ color: 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{log.message}</span>
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