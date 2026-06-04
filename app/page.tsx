'use client';
import { useState, useCallback, useMemo } from 'react';
import { Rocket, History, Settings, RefreshCw, GitBranch } from 'lucide-react';
import AuthCard from './components/AuthCard';
import RepoNameBuilder from './components/RepoNameBuilder';
import PerRepoFileManager, { RepoEntry } from './components/PerRepoFileManager';
import LogPanel from './components/LogPanel';
import HistoryPanel from './components/HistoryPanel';
import { createRepo, uploadFile, getUserOrgs, getOrgMembership } from './lib/github';
import { saveHistory } from './lib/storage';
import { CreationMode, LogItem, RepoFile } from './types';

type Tab = 'create' | 'history';

export default function Home() {
  const [tab, setTab] = useState<Tab>('create');

  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [userOrgs, setUserOrgs] = useState<string[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const [ownerType, setOwnerType] = useState<'personal' | 'org'>('personal');
  const [orgName, setOrgName] = useState('');
  const [customOrgInput, setCustomOrgInput] = useState(false);
  const [orgRole, setOrgRole] = useState<'admin' | 'member' | 'none' | null>(null);
  const [orgRoleLoading, setOrgRoleLoading] = useState(false);

  const [mode, setMode] = useState<CreationMode>('range');
  const [baseName, setBaseName] = useState('ss3_bai');
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(10);
  const [manualNames, setManualNames] = useState<string[]>(['']);
  const [freeText, setFreeText] = useState('');

  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [delay, setDelay] = useState(300);

  const [sharedFiles, setSharedFiles] = useState<RepoFile[]>([]);
  const [repoEntries, setRepoEntries] = useState<RepoEntry[]>([]);

  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [errCount, setErrCount] = useState(0);

  const owner = ownerType === 'org' ? orgName.trim() : username;

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
    if (ownerType === 'org' && !orgName.trim()) { alert('Hãy chọn hoặc nhập tên organization!'); return; }
    if (names.length > 100 && !confirm(`Bạn sắp tạo ${names.length} repos. Tiếp tục?`)) return;

    setRunning(true);
    setOkCount(0);
    setErrCount(0);
    setLogs(names.map(n => ({ name: n, status: 'pending', message: 'Đang chờ...' })));

    let ok = 0, err = 0;
    const results: { name: string; status: 'ok' | 'err'; url?: string; error?: string }[] = [];

    for (const name of names) {
      updateLog(name, { status: 'running', message: 'Đang tạo repo...' });

      const perRepo = syncedEntries.find(e => e.name === name)?.files ?? [];
      const mergedFiles: RepoFile[] = [...sharedFiles];
      for (const f of perRepo) {
        const idx = mergedFiles.findIndex(x => x.name === f.name);
        if (idx === -1) mergedFiles.push(f);
        else mergedFiles[idx] = f;
      }

      try {
        const repo = await createRepo(token, owner, name, description, isPrivate, autoInit, ownerType);
        if (mergedFiles.length > 0) {
          updateLog(name, { message: `Upload ${mergedFiles.length} file...` });
          for (const f of mergedFiles) {
            await uploadFile(token, owner, name, f);
          }
        }
        updateLog(name, {
          status: 'ok',
          message: `Thành công${mergedFiles.length > 0 ? ` · ${mergedFiles.length} file` : ''}`,
          url: repo.html_url,
        });
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

    saveHistory({ id: crypto.randomUUID(), timestamp: Date.now(), username: owner, repos: names, results });
    setRunning(false);
  }

  const handleAuth = useCallback(async (t: string, u: string, _avatar: string) => {
    setToken(t);
    setUsername(u);
    setOwnerType('personal');
    setOrgName('');
    setCustomOrgInput(false);
    setOrgRole(null);
    setOrgsLoading(true);
    const orgs = await getUserOrgs(t);
    setUserOrgs(orgs);
    setOrgsLoading(false);
  }, []);

  async function checkOrgRole(org: string) {
    if (!org || !token || !username) { setOrgRole(null); return; }
    setOrgRoleLoading(true);
    const role = await getOrgMembership(token, username, org);
    setOrgRole(role);
    setOrgRoleLoading(false);
  }

  function handleOwnerSelect(value: string) {
    setOrgRole(null);
    if (value === 'personal') {
      setOwnerType('personal');
      setOrgName('');
      setCustomOrgInput(false);
    } else if (value === '__custom__') {
      setOwnerType('org');
      setOrgName('');
      setCustomOrgInput(true);
    } else {
      setOwnerType('org');
      setOrgName(value);
      setCustomOrgInput(false);
      checkOrgRole(value);
    }
  }

  async function handleRefreshOrgs() {
    if (!token) return;
    setOrgsLoading(true);
    const orgs = await getUserOrgs(token);
    setUserOrgs(orgs);
    setOrgsLoading(false);
  }

  const selectValue = ownerType === 'personal'
    ? 'personal'
    : customOrgInput ? '__custom__' : orgName;

  function orgRoleBadge() {
    if (orgRoleLoading) return (
      <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Đang kiểm tra...
      </span>
    );
    if (!orgRole || orgRole === 'none') return (
      <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--red)', display: 'flex', gap: 6, alignItems: 'center' }}>
        ⚠ Không tìm thấy membership trong org này — repo có thể không tạo được.
      </div>
    );
    const isAdmin = orgRole === 'admin';
    return (
      <div style={{ marginTop: 8, padding: '8px 12px', background: isAdmin ? 'var(--green-dim)' : 'var(--accent-dim)', border: `1px solid ${isAdmin ? 'rgba(0,214,143,0.2)' : 'rgba(61,126,255,0.2)'}`, borderRadius: 8, fontSize: 12, color: isAdmin ? 'var(--green)' : 'var(--accent)', display: 'flex', gap: 6, alignItems: 'center' }}>
        {isAdmin ? '👑 Owner/Admin' : '👤 Member'} · <strong>{orgName}</strong>
        {orgRole === 'member' && <span style={{ opacity: 0.7 }}>(cần org cho phép member tạo repo)</span>}
      </div>
    );
  }

  const canStart = !running && !!token && names.length > 0 && (ownerType === 'personal' || !!orgName.trim());

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={16} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>GitHub Bulk Creator</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>Tạo nhiều repo cùng lúc</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'create', label: 'Tạo Repo', icon: <Rocket size={13} /> },
            { id: 'history', label: 'Lịch sử', icon: <History size={13} /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: tab === id ? '1px solid var(--border2)' : '1px solid transparent',
                background: tab === id ? 'var(--surface2)' : 'transparent',
                color: tab === id ? 'var(--text)' : 'var(--text3)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: tab === id ? 600 : 400,
                fontFamily: 'inherit',
                transition: 'all 0.18s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 60px' }}>
        {tab === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AuthCard onAuth={handleAuth} />

            <RepoNameBuilder
              mode={mode} onModeChange={setMode}
              baseName={baseName} onBaseNameChange={setBaseName}
              rangeFrom={rangeFrom} rangeTo={rangeTo}
              onRangeFromChange={setRangeFrom} onRangeToChange={setRangeTo}
              manualNames={manualNames} onManualNamesChange={setManualNames}
              freeText={freeText} onFreeTextChange={setFreeText}
              username={owner}
            />

            {/* Settings Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ width: 28, height: 28, background: 'var(--surface2)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={14} color="var(--text3)" />
                </div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Cài đặt Repo</span>
              </div>

              {token && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    Tạo repo vào
                    <button
                      onClick={handleRefreshOrgs}
                      disabled={orgsLoading}
                      title="Tải lại danh sách organization"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0 2px', display: 'flex', lineHeight: 1 }}
                    >
                      <RefreshCw size={11} style={orgsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                    </button>
                    {orgsLoading && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Đang tải...</span>}
                  </label>
                  <select value={selectValue} onChange={e => handleOwnerSelect(e.target.value)}>
                    <option value="personal">👤 Cá nhân ({username})</option>
                    {userOrgs.length > 0 && (
                      <optgroup label="Organizations của bạn">
                        {userOrgs.map(org => (
                          <option key={org} value={org}>🏢 {org}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__custom__">✏️ Nhập tên org khác...</option>
                  </select>
                  {userOrgs.length === 0 && !orgsLoading && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                      Không tìm thấy org. Token có thể thiếu quyền <code>read:org</code>.
                    </p>
                  )}
                  {customOrgInput && (
                    <input
                      type="text"
                      style={{ marginTop: 8 }}
                      placeholder="Tên organization (VD: my-company)"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      onBlur={() => checkOrgRole(orgName)}
                    />
                  )}
                  {ownerType === 'org' && orgName && orgRoleBadge()}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Visibility</label>
                  <select value={isPrivate ? 'private' : 'public'} onChange={e => setIsPrivate(e.target.value === 'private')}>
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
                <div>
                  <label>README tự động</label>
                  <select value={autoInit ? 'yes' : 'no'} onChange={e => setAutoInit(e.target.value === 'yes')}>
                    <option value="yes">✅ Có</option>
                    <option value="no">⬜ Không</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Mô tả (tuỳ chọn)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Auto-generated repo" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Delay giữa requests (ms)</label>
                  <input
                    type="number" value={delay} min={100} max={3000} step={50}
                    onChange={e => setDelay(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Ước tính thời gian</label>
                  <div style={{ padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text2)', fontFamily: "'JetBrains Mono', monospace" }}>
                    ~{names.length > 0 ? Math.ceil((names.length * delay) / 1000) : 0}s
                  </div>
                </div>
              </div>
            </div>

            <PerRepoFileManager
              repos={syncedEntries}
              onChange={setRepoEntries}
              sharedFiles={sharedFiles}
              onSharedChange={setSharedFiles}
            />

            {/* Action Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', position: 'sticky', bottom: 20, backdropFilter: 'blur(20px)' }}>
              <button
                className="btn-green"
                onClick={start}
                disabled={!canStart}
                style={{ padding: '11px 28px', fontSize: 15 }}
              >
                {running
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 16 }}>⟳</span> Đang tạo...</>
                  : <><Rocket size={16} /> Tạo {names.length > 0 ? `${names.length} ` : ''}Repo</>
                }
              </button>

              <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!token && (
                  <span style={{ fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⚠ Chưa xác thực GitHub
                  </span>
                )}
                {token && names.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⚠ Chưa có tên repo
                  </span>
                )}
                {ownerType === 'org' && !orgName.trim() && (
                  <span style={{ fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⚠ Chưa chọn organization
                  </span>
                )}
                {canStart && !running && (
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {names.length} repo · ~{Math.ceil((names.length * delay) / 1000)}s
                  </span>
                )}
              </div>
            </div>

            <LogPanel logs={logs} total={names.length} okCount={okCount} errCount={errCount} running={running} />
          </div>
        )}

        {tab === 'history' && <HistoryPanel />}
      </main>
    </div>
  );
}