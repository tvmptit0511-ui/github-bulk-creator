'use client';
import { useState, useCallback, useMemo } from 'react';
import { Rocket, History, Settings, Wrench } from 'lucide-react';
import AuthCard from './components/AuthCard';
import RepoNameBuilder from './components/RepoNameBuilder';
import PerRepoFileManager, { RepoEntry } from './components/PerRepoFileManager';
import LogPanel from './components/LogPanel';
import HistoryPanel from './components/HistoryPanel';
import RepoManager from './components/RepoManager';
import { createRepo, uploadFile } from './lib/github';
import { saveHistory } from './lib/storage';
import { CreationMode, LogItem, RepoFile } from './types';

type Tab = 'create' | 'manage' | 'history';

export default function Home() {
  const [tab, setTab] = useState<Tab>('create');

  // Auth
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');

  // Repo naming
  const [mode, setMode] = useState<CreationMode>('range');
  const [baseName, setBaseName] = useState('ss3_bai');
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(10);
  const [manualNames, setManualNames] = useState<string[]>(['']);
  const [freeText, setFreeText] = useState('');

  // Repo settings
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [delay, setDelay] = useState(300);

  // Files — shared (push to all) + per-repo
  const [sharedFiles, setSharedFiles] = useState<RepoFile[]>([]);
  const [repoEntries, setRepoEntries] = useState<RepoEntry[]>([]);

  // Execution
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [errCount, setErrCount] = useState(0);

  function getNames(): string[] {
    if (mode === 'range') {
      const from = Math.min(rangeFrom, rangeTo);
      const to = Math.max(rangeFrom, rangeTo);
      if (!baseName.trim() || to - from > 499) return [];
      return Array.from({ length: to - from + 1 }, (_, i) => baseName.trim() + (from + i));
    }
    if (mode === 'manual') return manualNames.filter(n => n.trim());
    return freeText.split('\n').map(s => s.trim()).filter(Boolean);
  }

  const names = getNames();

  const syncedEntries = useMemo<RepoEntry[]>(() => {
    return names.map(name => {
      const existing = repoEntries.find(e => e.name === name);
      return existing ?? { name, files: [] };
    });
  }, [names, repoEntries]);

  function updateLog(name: string, partial: Partial<LogItem>) {
    setLogs(prev => prev.map(l => l.name === name ? { ...l, ...partial } : l));
  }

  async function start() {
    if (running) return;
    if (!token) { alert('Hãy xác thực GitHub trước!'); return; }
    if (names.length === 0) { alert('Chưa có tên repo nào!'); return; }
    if (names.length > 100 && !confirm(`Bạn sắp tạo ${names.length} repos. Tiếp tục?`)) return;

    setRunning(true);
    setOkCount(0);
    setErrCount(0);
    setLogs(names.map(n => ({ name: n, status: 'pending', message: 'Chờ...' })));

    let ok = 0, err = 0;
    const results: { name: string; status: 'ok' | 'err'; url?: string; error?: string }[] = [];

    for (const name of names) {
      updateLog(name, { status: 'running', message: 'Đang tạo repo...' });

      const perRepo = syncedEntries.find(e => e.name === name)?.files ?? [];
      const mergedFiles: RepoFile[] = [...sharedFiles];
      for (const f of perRepo) {
        if (!mergedFiles.find(x => x.name === f.name)) mergedFiles.push(f);
        else {
          const idx = mergedFiles.findIndex(x => x.name === f.name);
          mergedFiles[idx] = f;
        }
      }

      try {
        const repo = await createRepo(token, name, description, isPrivate, autoInit);
        if (mergedFiles.length > 0) {
          updateLog(name, { message: `Upload ${mergedFiles.length} file...` });
          for (const f of mergedFiles) {
            await uploadFile(token, username, name, f);
          }
        }
        updateLog(name, { status: 'ok', message: `✓ Xong${mergedFiles.length > 0 ? ` (${mergedFiles.length} file)` : ''}`, url: repo.html_url });
        results.push({ name, status: 'ok', url: repo.html_url });
        ok++; setOkCount(ok);
      } catch (e) {
        const msg = (e as Error).message;
        updateLog(name, { status: 'error', message: msg });
        results.push({ name, status: 'err', error: msg });
        err++; setErrCount(err);
      }
      await new Promise(r => setTimeout(r, delay));
    }

    saveHistory({ id: crypto.randomUUID(), timestamp: Date.now(), username, repos: names, results });
    setRunning(false);
  }

  const handleAuth = useCallback((t: string, u: string) => {
    setToken(t); setUsername(u);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 10,
      }}>
        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 15 }}>GitHub Bulk Repo Creator</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Rocket size={13} /> Tạo Repo
          </button>
          <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wrench size={13} /> Quản lý
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={13} /> Lịch sử
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'create' && (
          <>
            <AuthCard onAuth={handleAuth} />

            <RepoNameBuilder
              mode={mode} onModeChange={setMode}
              baseName={baseName} onBaseNameChange={setBaseName}
              rangeFrom={rangeFrom} rangeTo={rangeTo}
              onRangeFromChange={setRangeFrom} onRangeToChange={setRangeTo}
              manualNames={manualNames} onManualNamesChange={setManualNames}
              freeText={freeText} onFreeTextChange={setFreeText}
              username={username}
            />

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings size={15} /> Cài đặt Repo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Visibility</label>
                  <select value={isPrivate ? 'private' : 'public'} onChange={e => setIsPrivate(e.target.value === 'private')}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label>README tự động</label>
                  <select value={autoInit ? 'yes' : 'no'} onChange={e => setAutoInit(e.target.value === 'yes')}>
                    <option value="yes">Có</option>
                    <option value="no">Không</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Mô tả (tuỳ chọn)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Auto-generated repo" />
              </div>
              <div>
                <label>Delay giữa các request (ms)</label>
                <input type="number" value={delay} min={100} max={3000} step={50} onChange={e => setDelay(Number(e.target.value))} style={{ width: 120 }} />
              </div>
            </div>

            <PerRepoFileManager
              repos={syncedEntries}
              onChange={setRepoEntries}
              sharedFiles={sharedFiles}
              onSharedChange={setSharedFiles}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <button
                className="btn-green"
                onClick={start}
                disabled={running || !token || names.length === 0}
                style={{ padding: '8px 20px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {running
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Đang tạo...</>
                  : <><Rocket size={16} /> Tạo {names.length > 0 ? `${names.length} ` : ''}Repo</>
                }
              </button>
              {!token && <span style={{ color: 'var(--warning)', fontSize: 13 }}>⚠ Chưa xác thực</span>}
              {token && names.length === 0 && <span style={{ color: 'var(--warning)', fontSize: 13 }}>⚠ Chưa có tên repo</span>}
            </div>

            <LogPanel logs={logs} total={names.length} okCount={okCount} errCount={errCount} running={running} />
          </>
        )}

        {tab === 'manage' && (
          <>
            <AuthCard onAuth={handleAuth} />
            <RepoManager token={token} username={username} />
          </>
        )}

        {tab === 'history' && <HistoryPanel />}
      </main>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}