'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Trash2, ArrowRight, Lock, Unlock, CheckSquare, Square, Loader, CheckCircle, XCircle, Clock, AlertTriangle, GitBranch, ChevronDown, ChevronUp, Building2, User, FilePlus } from 'lucide-react';
import { listUserRepos, listOrgRepos, listUserOrgs, updateRepo, deleteRepo, transferRepo, RepoInfo, OrgInfo } from '@/app/lib/github';
import { LogItem } from '@/app/types';
import RepoFileUpdater from './RepoFileUpdater';

interface Props { token: string; username: string; }

type BulkAction = 'rename_prefix' | 'rename_suffix' | 'rename_replace' | 'delete' | 'transfer' | 'visibility' | 'description';
interface ActionConfig { type: BulkAction; prefix?: string; suffix?: string; findStr?: string; replaceStr?: string; newOwner?: string; makePrivate?: boolean; description?: string; }
const ACTION_LABELS: Record<BulkAction, string> = { rename_prefix: '➕ Thêm tiền tố', rename_suffix: '➕ Thêm hậu tố', rename_replace: '🔄 Tìm & Thay thế tên', delete: '🗑️ Xoá hàng loạt', transfer: '📦 Chuyển owner', visibility: '🔒 Đổi visibility', description: '📝 Cập nhật mô tả' };
type OwnerMode = 'personal' | string;
type ManageTab = 'bulk' | 'files';

export default function RepoManager({ token, username }: Props) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('personal');
  const [filter, setFilter] = useState('');
  const [filterPrivate, setFilterPrivate] = useState<'all' | 'public' | 'private'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BulkAction>('rename_prefix');
  const [actionCfg, setActionCfg] = useState<ActionConfig>({ type: 'rename_prefix', prefix: '' });
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [errCount, setErrCount] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [manageTab, setManageTab] = useState<ManageTab>('bulk');

  const effectiveOwner = ownerMode === 'personal' ? username : ownerMode;

  useEffect(() => {
    if (!token) return;
    setOrgsLoading(true);
    listUserOrgs(token).then(data => setOrgs(data)).catch(() => setOrgs([])).finally(() => setOrgsLoading(false));
  }, [token]);

  const loadRepos = useCallback(async (reset = true) => {
    if (!token) return;
    setLoading(true); setLoadError('');
    const p = reset ? 1 : page;
    try {
      let data: RepoInfo[];
      if (ownerMode === 'personal') data = await listUserRepos(token, p, 100);
      else data = await listOrgRepos(token, ownerMode, p, 100);
      if (reset) { setRepos(data); setPage(1); }
      else { setRepos(prev => { const names = new Set(prev.map(r => r.name)); return [...prev, ...data.filter(r => !names.has(r.name))]; }); }
      setHasMore(data.length === 100);
      if (!reset) setPage(p + 1);
    } catch (e) { setLoadError((e as Error).message); }
    finally { setLoading(false); }
  }, [token, page, ownerMode]);

  useEffect(() => { if (token) { setSelected(new Set()); setLogs([]); loadRepos(true); } }, [token, ownerMode]);

  const filtered = repos.filter(r => {
    const matchName = r.name.toLowerCase().includes(filter.toLowerCase());
    const matchVis = filterPrivate === 'all' || (filterPrivate === 'private' && r.private) || (filterPrivate === 'public' && !r.private);
    return matchName && matchVis;
  });

  function toggleSelect(name: string) { setSelected(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; }); }
  function selectAll() { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(r => r.name))); }

  function previewNewName(oldName: string): string {
    switch (actionType) {
      case 'rename_prefix': return (actionCfg.prefix || '') + oldName;
      case 'rename_suffix': return oldName + (actionCfg.suffix || '');
      case 'rename_replace': return actionCfg.findStr ? oldName.replaceAll(actionCfg.findStr, actionCfg.replaceStr || '') : oldName;
      default: return oldName;
    }
  }

  function updateLog(name: string, partial: Partial<LogItem>) { setLogs(prev => prev.map(l => l.name === name ? { ...l, ...partial } : l)); }

  async function execute() {
    if (selected.size === 0) return;
    const isDestructive = actionType === 'delete' || actionType === 'transfer';
    if (isDestructive && !confirmDelete) { setConfirmDelete(true); return; }
    setRunning(true); setConfirmDelete(false); setOkCount(0); setErrCount(0); setShowLogs(true);
    const names = [...selected];
    setLogs(names.map(n => ({ name: n, status: 'pending', message: 'Chờ...' })));
    let ok = 0, err = 0;
    for (const name of names) {
      updateLog(name, { status: 'running', message: 'Đang xử lý...' });
      try {
        switch (actionType) {
          case 'rename_prefix': case 'rename_suffix': case 'rename_replace': {
            const newName = previewNewName(name);
            if (newName === name) { updateLog(name, { status: 'skip', message: 'Tên không thay đổi' }); ok++; setOkCount(ok); break; }
            await updateRepo(token, effectiveOwner, name, { name: newName });
            setRepos(prev => prev.map(r => r.name === name ? { ...r, name: newName } : r));
            updateLog(name, { status: 'ok', message: `✓ → "${newName}"` }); ok++; setOkCount(ok); break;
          }
          case 'delete': {
            await deleteRepo(token, effectiveOwner, name);
            setRepos(prev => prev.filter(r => r.name !== name));
            updateLog(name, { status: 'ok', message: '✓ Đã xoá' }); ok++; setOkCount(ok); break;
          }
          case 'transfer': {
            if (!actionCfg.newOwner) throw new Error('Chưa nhập owner mới');
            await transferRepo(token, effectiveOwner, name, actionCfg.newOwner);
            setRepos(prev => prev.filter(r => r.name !== name));
            updateLog(name, { status: 'ok', message: `✓ → @${actionCfg.newOwner}` }); ok++; setOkCount(ok); break;
          }
          case 'visibility': {
            if (actionCfg.makePrivate === undefined) {
              throw new Error('Chưa chọn Public/Private');
            }

            const result = await updateRepo(token, effectiveOwner, name, {
              private: actionCfg.makePrivate,
            });

            // Verify GitHub thực sự đã đổi
            if (result.private !== actionCfg.makePrivate) {
              throw new Error(
                `Không thể đổi sang ${actionCfg.makePrivate ? 'Private' : 'Public'} — kiểm tra quyền token`
              );
            }

            setRepos(prev =>
              prev.map(r => r.name === name ? { ...r, private: !!actionCfg.makePrivate } : r)
            );
            updateLog(name, {
              status: 'ok',
              message: `✓ → ${actionCfg.makePrivate ? 'Private' : 'Public'}`,
            });
            ok++; setOkCount(ok);
            break;
          }
          case 'description': {
            await updateRepo(token, effectiveOwner, name, { description: actionCfg.description ?? '' });
            updateLog(name, { status: 'ok', message: '✓ Cập nhật mô tả' }); ok++; setOkCount(ok); break;
          }
        }
      } catch (e) { updateLog(name, { status: 'error', message: (e as Error).message }); err++; setErrCount(err); }
      await new Promise(r => setTimeout(r, 300));
    }
    setSelected(new Set()); setRunning(false);
  }

  const isRenameAction = ['rename_prefix', 'rename_suffix', 'rename_replace'].includes(actionType);
  const selectedList = filtered.filter(r => selected.has(r.name));

  if (!token) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>
        <GitBranch size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
        <p>Xác thực GitHub trước để quản lý repo</p>
      </div>
    );
  }

  return (
    <div>
      {/* Owner Selector */}
      <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', flexShrink: 0 }}>Xem repo của</span>
          <button onClick={() => setOwnerMode('personal')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: `1px solid ${ownerMode === 'personal' ? 'var(--blue)' : 'var(--border)'}`, background: ownerMode === 'personal' ? 'var(--blue-dim)' : 'var(--surface2)', color: ownerMode === 'personal' ? 'var(--blue-bright)' : 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: ownerMode === 'personal' ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            <User size={12} /> @{username || 'cá nhân'}
          </button>
          {orgsLoading
            ? <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải...</span>
            : orgs.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Không có tổ chức (cần scope <code style={{ fontSize: 10 }}>read:org</code>)</span>
              : orgs.map(org => (
                <button key={org.login} onClick={() => setOwnerMode(org.login)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: `1px solid ${ownerMode === org.login ? 'var(--blue)' : 'var(--border)'}`, background: ownerMode === org.login ? 'var(--blue-dim)' : 'var(--surface2)', color: ownerMode === org.login ? 'var(--blue-bright)' : 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {org.avatar_url ? <img src={org.avatar_url} alt={org.login} style={{ width: 14, height: 14, borderRadius: 3 }} /> : <Building2 size={12} />}
                  {org.login}
                </button>
              ))
          }
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Lọc theo tên..." style={{ paddingLeft: 28 }} />
          </div>
          <select value={filterPrivate} onChange={e => setFilterPrivate(e.target.value as typeof filterPrivate)} style={{ width: 120 }}>
            <option value="all">Tất cả</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button className="btn btn-ghost" onClick={() => loadRepos(true)} disabled={loading} style={{ flexShrink: 0 }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
        {loadError && <div style={{ marginTop: 8, color: 'var(--red)', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}><XCircle size={13} /> {loadError}</div>}
        {repos.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span>{repos.length} repo · hiển thị {filtered.length}</span>
            {hasMore && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => loadRepos(false)} disabled={loading}>Tải thêm...</button>}
          </div>
        )}
      </div>

      <div className="manager-layout">
        {/* Repo list */}
        <div>
          {filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px 8px 0 0', borderBottom: 'none', fontSize: 12 }}>
              <button onClick={selectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', padding: 0 }}>
                {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} style={{ color: 'var(--blue-bright)' }} /> : <Square size={14} />}
              </button>
              <span style={{ color: 'var(--text2)' }}>{selected.size > 0 ? `Đã chọn ${selected.size}/${filtered.length}` : `Chọn tất cả (${filtered.length})`}</span>
              {selected.size > 0 && <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11 }}>Bỏ chọn</button>}
            </div>
          )}
          <div style={{ border: '1px solid var(--border)', borderRadius: filtered.length > 0 ? '0 0 8px 8px' : 8, overflow: 'hidden', maxHeight: 480, overflowY: 'auto' }}>
            {loading && repos.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}><Loader size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />Đang tải...</div>
              : filtered.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>{repos.length === 0 ? 'Không có repo nào' : 'Không tìm thấy repo phù hợp'}</div>
                : filtered.map((repo, i) => {
                  const isSel = selected.has(repo.name);
                  const newName = isRenameAction && manageTab === 'bulk' ? previewNewName(repo.name) : null;
                  const nameChanged = newName !== null && newName !== repo.name;
                  return (
                    <div key={repo.name} onClick={() => toggleSelect(repo.name)} className={`repo-item${isSel ? ' selected' : ''}`}>
                      <span style={{ color: isSel ? 'var(--blue-bright)' : 'var(--text3)', flexShrink: 0 }}>{isSel ? <CheckSquare size={14} /> : <Square size={14} />}</span>
                      <span style={{ flexShrink: 0 }}>{repo.private ? <Lock size={11} style={{ color: 'var(--yellow)' }} /> : <Unlock size={11} style={{ color: 'var(--text3)' }} />}</span>
                      <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, overflow: 'hidden' }}>
                        <span style={{ color: nameChanged ? 'var(--text3)' : 'var(--blue-bright)', textDecoration: nameChanged ? 'line-through' : 'none' }}>{repo.name}</span>
                        {nameChanged && <><ArrowRight size={10} style={{ display: 'inline', margin: '0 4px', verticalAlign: 'middle', color: 'var(--text3)' }} /><span style={{ color: 'var(--green)' }}>{newName}</span></>}
                      </span>
                      {repo.description && <span style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.description}</span>}
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Right panel */}
        <div>
          {/* Sub-tabs */}
          <div className="mode-tabs" style={{ marginBottom: 10 }}>
            <button onClick={() => setManageTab('bulk')} className={`mode-tab${manageTab === 'bulk' ? ' active' : ''}`}>⚡ Hành động</button>
            <button onClick={() => setManageTab('files')} className={`mode-tab${manageTab === 'files' ? ' active' : ''}`}><FilePlus size={12} /> Cập nhật file</button>
          </div>

          {manageTab === 'bulk' && (
            <>
              <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>⚡ Hành động hàng loạt</div>
                <div style={{ marginBottom: 12 }}>
                  <label>Loại hành động</label>
                  <select value={actionType} onChange={e => {
                    const t = e.target.value as BulkAction;
                    setActionType(t);
                    setActionCfg({ type: t, makePrivate: t === 'visibility' ? false : undefined });
                    setConfirmDelete(false);
                  }}>
                    {(Object.keys(ACTION_LABELS) as BulkAction[]).map(k => <option key={k} value={k}>{ACTION_LABELS[k]}</option>)}
                  </select>
                </div>
                {actionType === 'rename_prefix' && <div style={{ marginBottom: 12 }}><label>Tiền tố thêm vào đầu</label><input type="text" placeholder="vd: 2024_" value={actionCfg.prefix ?? ''} onChange={e => setActionCfg(c => ({ ...c, prefix: e.target.value }))} /></div>}
                {actionType === 'rename_suffix' && <div style={{ marginBottom: 12 }}><label>Hậu tố thêm vào cuối</label><input type="text" placeholder="vd: _archive" value={actionCfg.suffix ?? ''} onChange={e => setActionCfg(c => ({ ...c, suffix: e.target.value }))} /></div>}
                {actionType === 'rename_replace' && <div style={{ marginBottom: 12 }}><div style={{ marginBottom: 8 }}><label>Tìm chuỗi</label><input type="text" placeholder="vd: ss3_" value={actionCfg.findStr ?? ''} onChange={e => setActionCfg(c => ({ ...c, findStr: e.target.value }))} /></div><div><label>Thay bằng</label><input type="text" placeholder="vd: lab_ (để trống = xoá)" value={actionCfg.replaceStr ?? ''} onChange={e => setActionCfg(c => ({ ...c, replaceStr: e.target.value }))} /></div></div>}
                {actionType === 'transfer' && (
                  <div style={{ marginBottom: 12 }}>
                    <label>Owner mới</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1, display: 'flex', alignItems: 'center' }}>
                        {!actionCfg.newOwner || actionCfg.newOwner === username ? (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                            {(username[0] ?? '?').toUpperCase()}
                          </div>
                        ) : (() => {
                          const org = orgs.find(o => o.login === actionCfg.newOwner);
                          return org?.avatar_url
                            ? <img src={org.avatar_url} alt={org.login} style={{ width: 18, height: 18, borderRadius: 3 }} />
                            : <Building2 size={14} color="var(--text2)" />;
                        })()}
                      </div>
                      <select
                        value={actionCfg.newOwner ?? ''}
                        onChange={e => setActionCfg(c => ({ ...c, newOwner: e.target.value }))}
                        style={{ width: '100%', paddingLeft: 36, paddingRight: 32, appearance: 'none' }}
                      >
                        <option value="">— Chọn owner —</option>
                        <option value={username}>@{username} (cá nhân)</option>
                        {orgs.map(o => (
                          <option key={o.login} value={o.login}>{o.login} (org)</option>
                        ))}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text2)' }} />
                    </div>
                    {orgsLoading && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Đang tải danh sách org...</p>}
                    {!orgsLoading && orgs.length === 0 && (
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Không tìm thấy org — cần scope <code style={{ fontSize: 10 }}>read:org</code></p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 4 }}>⚠ Owner mới phải có quyền nhận repo</p>
                  </div>
                )}
                {actionType === 'visibility' && <div style={{ marginBottom: 12 }}><label>Đổi thành</label><div className="segment-group"><button className={`segment-btn${!actionCfg.makePrivate ? ' active' : ''}`} onClick={() => setActionCfg(c => ({ ...c, makePrivate: false }))}>Public</button><button className={`segment-btn${actionCfg.makePrivate ? ' active' : ''}`} onClick={() => setActionCfg(c => ({ ...c, makePrivate: true }))}>Private</button></div></div>}
                {actionType === 'description' && <div style={{ marginBottom: 12 }}><label>Mô tả mới</label><input type="text" placeholder="Mô tả repo..." value={actionCfg.description ?? ''} onChange={e => setActionCfg(c => ({ ...c, description: e.target.value }))} /></div>}
                {actionType === 'delete' && <div style={{ padding: '8px 10px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, marginBottom: 12, fontSize: 12 }}><div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--red)', fontWeight: 600 }}><AlertTriangle size={13} /> Không thể hoàn tác!</div><div style={{ color: 'var(--text3)', marginTop: 3 }}>Repo bị xoá sẽ mất vĩnh viễn.</div></div>}
                {confirmDelete && (
                  <div style={{ padding: '10px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, marginBottom: 10 }}>
                    <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Xác nhận {actionType === 'delete' ? 'xoá' : 'chuyển'} {selected.size} repo?</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={execute} style={{ background: 'var(--red)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '5px 12px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Xác nhận</button>
                      <button className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 10px' }} onClick={() => setConfirmDelete(false)}>Huỷ</button>
                    </div>
                  </div>
                )}
                <button onClick={execute} disabled={running || selected.size === 0 || confirmDelete} className={`btn ${actionType === 'delete' ? 'btn-danger' : 'btn-success'}`} style={{ width: '100%', justifyContent: 'center', padding: '9px' }}>
                  {running ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang chạy...</> : selected.size === 0 ? 'Chọn repo để bắt đầu' : `${ACTION_LABELS[actionType].split(' ').slice(1).join(' ')} ${selected.size} repo`}
                </button>
              </div>

              {isRenameAction && selected.size > 0 && (
                <div className="card" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>👁 Preview ({Math.min(selected.size, 5)}/{selected.size})</div>
                  {selectedList.slice(0, 5).map(r => {
                    const newN = previewNewName(r.name);
                    return (
                      <div key={r.name} style={{ fontSize: 11, fontFamily: 'monospace', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--text3)', textDecoration: 'line-through', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                        <ArrowRight size={9} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                        <span style={{ color: newN !== r.name ? 'var(--green)' : 'var(--text3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{newN}</span>
                      </div>
                    );
                  })}
                  {selected.size > 5 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>... và {selected.size - 5} repo nữa</span>}
                </div>
              )}
            </>
          )}

          {manageTab === 'files' && <RepoFileUpdater token={token} owner={effectiveOwner} selectedRepos={[...selected]} />}
        </div>
      </div>

      {/* Bulk logs */}
      {manageTab === 'bulk' && logs.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: showLogs ? 10 : 0 }} onClick={() => setShowLogs(v => !v)}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{running ? '⏳ Đang xử lý...' : '✅ Kết quả'}</span>
            <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ {okCount}</span>
            {errCount > 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>✗ {errCount}</span>}
            <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>{showLogs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
          </div>
          <div className="progress-track" style={{ marginBottom: showLogs ? 10 : 0 }}>
            <div className="progress-fill" style={{ width: `${logs.length > 0 ? Math.round(((okCount + errCount) / logs.length) * 100) : 0}%` }} />
          </div>
          {showLogs && (
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {logs.map(log => (
                <div key={log.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderBottom: '1px solid var(--surface2)', fontFamily: 'monospace', fontSize: 12 }}>
                  <span style={{ flexShrink: 0, color: log.status === 'ok' ? 'var(--green)' : log.status === 'error' ? 'var(--red)' : log.status === 'running' ? 'var(--blue-bright)' : 'var(--text3)' }}>
                    {log.status === 'ok' && <CheckCircle size={12} />}
                    {log.status === 'error' && <XCircle size={12} />}
                    {log.status === 'running' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                    {(log.status === 'pending' || log.status === 'skip') && <Clock size={12} />}
                  </span>
                  <strong style={{ color: 'var(--blue-bright)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.name}</strong>
                  <span style={{ color: 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}