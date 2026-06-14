'use client';
import { useState, useCallback, useMemo } from 'react';
import { Rocket, Settings } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPage from './components/DashboardPage';
import AuthCard from './components/AuthCard';
import RepoNameBuilder from './components/RepoNameBuilder';
import PerRepoFileManager, { RepoEntry } from './components/PerRepoFileManager';
import LogPanel from './components/LogPanel';
import HistoryPanel from './components/HistoryPanel';
import RepoManager from './components/RepoManager';
import GuidePage from './components/GuidePage'; // ← THÊM DÒNG NÀY
import { createRepo, uploadFile, listUserOrgs, OrgInfo } from './lib/github';
import { saveHistory, getHistory } from './lib/storage';
import { CreationMode, LogItem, RepoFile } from './types';

type Page = 'dashboard' | 'creator' | 'manager' | 'history' | 'guide'; // ← thêm 'guide'

export default function Home() {
  const [page, setPage] = useState<Page>('dashboard');

  // Auth
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Orgs
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [orgsLoading, setOrgsLoading] = useState(false);

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

  // Files
  const [sharedFiles, setSharedFiles] = useState<RepoFile[]>([]);
  const [repoEntries, setRepoEntries] = useState<RepoEntry[]>([]);

  // Execution
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [errCount, setErrCount] = useState(0);

  const history = getHistory();

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

    const effectiveOwner = selectedOrg || username;

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
        const repo = await createRepo(token, name, description, isPrivate, autoInit, selectedOrg || undefined);
        if (mergedFiles.length > 0) {
          updateLog(name, { message: `Upload ${mergedFiles.length} file...` });
          for (const f of mergedFiles) {
            await uploadFile(token, effectiveOwner, name, f);
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

  const handleAuth = useCallback(async (t: string, u: string, av: string) => {
    setToken(t);
    setUsername(u);
    setAvatarUrl(av);
    setSelectedOrg('');
    setOrgs([]);

    setOrgsLoading(true);
    try {
      const data = await listUserOrgs(t);
      setOrgs(data);
    } catch {
      setOrgs([]);
    } finally {
      setOrgsLoading(false);
    }
  }, []);

  const ownerLabel = selectedOrg
    ? orgs.find(o => o.login === selectedOrg)?.login ?? selectedOrg
    : username;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        username={username}
        avatarUrl={avatarUrl}
        repoCount={history.reduce((s, e) => s + e.repos.length, 0) || undefined}
      />

      <div className="main-content">
        <Topbar activePage={page} username={username} avatarUrl={avatarUrl} />

        <div className="page-content">

          {/* ── DASHBOARD ── */}
          {page === 'dashboard' && (
            <DashboardPage
              username={username}
              avatarUrl={avatarUrl}
              history={history}
              onNavigate={setPage}
            />
          )}

          {/* ── CREATOR ── */}
          {page === 'creator' && (
            <div className="animate-in">
              <div style={{ marginBottom: 20 }}>
                <div className="section-title">Repo Creator</div>
                <div className="section-sub">Tạo hàng loạt GitHub repository trong vài giây</div>
              </div>

              <div className="creator-layout">
                {/* Left: form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <AuthCard onAuth={handleAuth} />
                  <RepoNameBuilder
                    mode={mode} onModeChange={setMode}
                    baseName={baseName} onBaseNameChange={setBaseName}
                    rangeFrom={rangeFrom} rangeTo={rangeTo}
                    onRangeFromChange={setRangeFrom} onRangeToChange={setRangeTo}
                    manualNames={manualNames} onManualNamesChange={setManualNames}
                    freeText={freeText} onFreeTextChange={setFreeText}
                    username={username}
                    orgs={orgs}
                    orgsLoading={orgsLoading}
                    selectedOrg={selectedOrg}
                    onOrgChange={setSelectedOrg}
                  />
                  <PerRepoFileManager
                    repos={syncedEntries}
                    onChange={setRepoEntries}
                    sharedFiles={sharedFiles}
                    onSharedChange={setSharedFiles}
                  />
                  <LogPanel logs={logs} total={names.length} okCount={okCount} errCount={errCount} running={running} />
                </div>

                {/* Right: settings + create button */}
                <div style={{ position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="card">
                    <div className="card-header">
                      <Settings size={15} style={{ color: 'var(--text2)' }} />
                      <span className="card-title">Cài đặt Repo</span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label>Visibility</label>
                      <div className="segment-group">
                        <button className={`segment-btn${!isPrivate ? ' active' : ''}`} onClick={() => setIsPrivate(false)}>Public</button>
                        <button className={`segment-btn${isPrivate ? ' active' : ''}`} onClick={() => setIsPrivate(true)}>Private</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label>README tự động</label>
                      <div className="segment-group">
                        <button className={`segment-btn${autoInit ? ' active' : ''}`} onClick={() => setAutoInit(true)}>Có</button>
                        <button className={`segment-btn${!autoInit ? ' active' : ''}`} onClick={() => setAutoInit(false)}>Không</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label>Mô tả (tuỳ chọn)</label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Auto-generated repo"
                      />
                    </div>

                    <div>
                      <label>Delay giữa requests (ms)</label>
                      <input
                        type="number"
                        value={delay}
                        min={100} max={3000} step={50}
                        onChange={e => setDelay(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="card" style={{ background: names.length > 0 && token ? 'linear-gradient(135deg, rgba(31,111,235,0.12), rgba(63,185,80,0.08))' : 'var(--surface)', borderColor: names.length > 0 && token ? 'rgba(31,111,235,0.3)' : 'var(--border)' }}>
                    <button
                      onClick={start}
                      disabled={running || !token || names.length === 0}
                      className="btn btn-success"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15, marginBottom: 10 }}
                    >
                      {running
                        ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Đang tạo...</>
                        : <><Rocket size={16} /> Tạo {names.length > 0 ? `${names.length} ` : ''}Repo{selectedOrg ? ` trong ${selectedOrg}` : ''}</>
                      }
                    </button>

                    {!token && (
                      <div style={{ fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        ⚠ Vui lòng nhập token để tiếp tục
                      </div>
                    )}
                    {token && names.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        ⚠ Chưa có tên repo nào
                      </div>
                    )}
                    {token && names.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        Sẵn sàng tạo <strong style={{ color: 'var(--green)' }}>{names.length}</strong> repo
                        {' '}dưới <strong style={{ color: 'var(--accent)' }}>{ownerLabel}</strong>
                        {sharedFiles.length > 0 && ` · ${sharedFiles.length} file đính kèm`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MANAGER ── */}
          {page === 'manager' && (
            <div className="animate-in">
              <div style={{ marginBottom: 20 }}>
                <div className="section-title">Quản lý Repos</div>
                <div className="section-sub">Đổi tên, xoá, chuyển owner và cập nhật file hàng loạt</div>
              </div>
              <AuthCard onAuth={handleAuth} />
              <div style={{ marginTop: 16 }}>
                <RepoManager token={token} username={username} />
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {page === 'history' && (
            <div className="animate-in">
              <div style={{ marginBottom: 20 }}>
                <div className="section-title">Lịch sử</div>
                <div className="section-sub">Xem lại các phiên tạo repo trước đây</div>
              </div>
              <HistoryPanel />
            </div>
          )}

          {/* ── GUIDE ── */}
          {page === 'guide' && <GuidePage />}

        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}