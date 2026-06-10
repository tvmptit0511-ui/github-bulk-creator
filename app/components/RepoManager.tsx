'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Trash2, Edit3, ArrowRight, Lock, Unlock,
  CheckSquare, Square, Loader, CheckCircle, XCircle, Clock,
  AlertTriangle, GitBranch, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import { listUserRepos, updateRepo, deleteRepo, transferRepo, RepoInfo } from '@/app/lib/github';
import { LogItem } from '@/app/types';

interface Props {
  token: string;
  username: string;
}

type BulkAction = 'rename_prefix' | 'rename_suffix' | 'rename_replace' | 'delete' | 'transfer' | 'visibility' | 'description';

interface ActionConfig {
  type: BulkAction;
  // rename
  prefix?: string;
  suffix?: string;
  findStr?: string;
  replaceStr?: string;
  // transfer
  newOwner?: string;
  // visibility
  makePrivate?: boolean;
  // description
  description?: string;
}

const ACTION_LABELS: Record<BulkAction, string> = {
  rename_prefix: '➕ Thêm tiền tố',
  rename_suffix: '➕ Thêm hậu tố',
  rename_replace: '🔄 Tìm & Thay thế tên',
  delete: '🗑️ Xoá hàng loạt',
  transfer: '📦 Chuyển owner',
  visibility: '🔒 Đổi visibility',
  description: '📝 Cập nhật mô tả',
};

export default function RepoManager({ token, username }: Props) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
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

  const loadRepos = useCallback(async (reset = true) => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    const p = reset ? 1 : page;
    try {
      const data = await listUserRepos(token, p, 100);
      if (reset) {
        setRepos(data);
        setPage(1);
      } else {
        setRepos(prev => {
          const names = new Set(prev.map(r => r.name));
          return [...prev, ...data.filter(r => !names.has(r.name))];
        });
      }
      setHasMore(data.length === 100);
      if (!reset) setPage(p + 1);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    if (token) loadRepos();
  }, [token]);

  const filtered = repos.filter(r => {
    const matchName = r.name.toLowerCase().includes(filter.toLowerCase());
    const matchVis =
      filterPrivate === 'all' ||
      (filterPrivate === 'private' && r.private) ||
      (filterPrivate === 'public' && !r.private);
    return matchName && matchVis;
  });

  function toggleSelect(name: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.name)));
    }
  }

  function previewNewName(oldName: string): string {
    switch (actionType) {
      case 'rename_prefix':
        return (actionCfg.prefix || '') + oldName;
      case 'rename_suffix':
        return oldName + (actionCfg.suffix || '');
      case 'rename_replace':
        return actionCfg.findStr
          ? oldName.replaceAll(actionCfg.findStr, actionCfg.replaceStr || '')
          : oldName;
      default:
        return oldName;
    }
  }

  function updateLog(name: string, partial: Partial<LogItem>) {
    setLogs(prev => prev.map(l => l.name === name ? { ...l, ...partial } : l));
  }

  async function execute() {
    if (selected.size === 0) return;

    const isDestructive = actionType === 'delete' || actionType === 'transfer';
    if (isDestructive && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setRunning(true);
    setConfirmDelete(false);
    setOkCount(0);
    setErrCount(0);
    setShowLogs(true);

    const names = [...selected];
    setLogs(names.map(n => ({ name: n, status: 'pending', message: 'Chờ...' })));

    let ok = 0, err = 0;

    for (const name of names) {
      updateLog(name, { status: 'running', message: 'Đang xử lý...' });
      try {
        switch (actionType) {
          case 'rename_prefix':
          case 'rename_suffix':
          case 'rename_replace': {
            const newName = previewNewName(name);
            if (newName === name) {
              updateLog(name, { status: 'skip', message: 'Tên không thay đổi, bỏ qua' });
              ok++; setOkCount(ok);
              break;
            }
            await updateRepo(token, username, name, { name: newName });
            // Update local list
            setRepos(prev => prev.map(r => r.name === name ? { ...r, name: newName } : r));
            updateLog(name, { status: 'ok', message: `✓ Đổi thành "${newName}"` });
            ok++; setOkCount(ok);
            break;
          }
          case 'delete': {
            await deleteRepo(token, username, name);
            setRepos(prev => prev.filter(r => r.name !== name));
            updateLog(name, { status: 'ok', message: '✓ Đã xoá' });
            ok++; setOkCount(ok);
            break;
          }
          case 'transfer': {
            if (!actionCfg.newOwner) throw new Error('Chưa nhập owner mới');
            await transferRepo(token, username, name, actionCfg.newOwner);
            setRepos(prev => prev.filter(r => r.name !== name));
            updateLog(name, { status: 'ok', message: `✓ Chuyển cho @${actionCfg.newOwner}` });
            ok++; setOkCount(ok);
            break;
          }
          case 'visibility': {
            await updateRepo(token, username, name, { private: actionCfg.makePrivate });
            setRepos(prev => prev.map(r => r.name === name ? { ...r, private: !!actionCfg.makePrivate } : r));
            updateLog(name, {
              status: 'ok',
              message: `✓ Đổi thành ${actionCfg.makePrivate ? 'Private' : 'Public'}`,
            });
            ok++; setOkCount(ok);
            break;
          }
          case 'description': {
            await updateRepo(token, username, name, { description: actionCfg.description ?? '' });
            setRepos(prev => prev.map(r => r.name === name ? { ...r, description: actionCfg.description ?? null } : r));
            updateLog(name, { status: 'ok', message: '✓ Cập nhật mô tả' });
            ok++; setOkCount(ok);
            break;
          }
        }
      } catch (e) {
        const msg = (e as Error).message;
        updateLog(name, { status: 'error', message: msg });
        err++; setErrCount(err);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    setSelected(new Set());
    setRunning(false);
  }

  const isRenameAction = ['rename_prefix', 'rename_suffix', 'rename_replace'].includes(actionType);
  const selectedList = filtered.filter(r => selected.has(r.name));

  if (!token) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
        <GitBranch size={32} style={{ margin: '0 auto 8px' }} />
        <p>Xác thực GitHub trước để quản lý repo</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Lọc theo tên..."
              style={{ paddingLeft: 30 }}
            />
          </div>
          <select
            value={filterPrivate}
            onChange={e => setFilterPrivate(e.target.value as typeof filterPrivate)}
            style={{ width: 130 }}
          >
            <option value="all">Tất cả</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button
            className="btn-ghost"
            onClick={() => loadRepos(true)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {loadError && (
          <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <XCircle size={13} /> {loadError}
          </div>
        )}

        {repos.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>{repos.length} repo · hiển thị {filtered.length}</span>
            {hasMore && (
              <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => loadRepos(false)} disabled={loading}>
                Tải thêm...
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        {/* Repo list */}
        <div>
          {/* Select all bar */}
          {filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '6px 6px 0 0', borderBottom: 'none',
              fontSize: 12,
            }}>
              <button onClick={selectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0 }}>
                {selected.size === filtered.length && filtered.length > 0
                  ? <CheckSquare size={15} style={{ color: 'var(--blue)' }} />
                  : <Square size={15} />
                }
              </button>
              <span style={{ color: 'var(--muted)' }}>
                {selected.size > 0 ? `Đã chọn ${selected.size}/${filtered.length}` : `Chọn tất cả (${filtered.length})`}
              </span>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>
                  Bỏ chọn
                </button>
              )}
            </div>
          )}

          {/* List */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: filtered.length > 0 ? '0 0 6px 6px' : 6,
            overflow: 'hidden',
            maxHeight: 480,
            overflowY: 'auto',
          }}>
            {loading && repos.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                Đang tải danh sách repo...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                {repos.length === 0 ? 'Không có repo nào' : 'Không tìm thấy repo phù hợp'}
              </div>
            ) : (
              filtered.map((repo, i) => {
                const isSel = selected.has(repo.name);
                const newName = isRenameAction ? previewNewName(repo.name) : null;
                const nameChanged = newName !== null && newName !== repo.name;
                return (
                  <div
                    key={repo.name}
                    onClick={() => toggleSelect(repo.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--surface2)' : 'none',
                      background: isSel ? 'rgba(31,111,235,0.08)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ color: isSel ? 'var(--blue)' : 'var(--muted)', flexShrink: 0 }}>
                      {isSel ? <CheckSquare size={14} /> : <Square size={14} />}
                    </span>
                    <span style={{ flexShrink: 0 }}>
                      {repo.private
                        ? <Lock size={11} style={{ color: 'var(--warning)' }} />
                        : <Unlock size={11} style={{ color: 'var(--muted)' }} />
                      }
                    </span>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, overflow: 'hidden' }}>
                      <span style={{ color: nameChanged ? 'var(--muted)' : '#79c0ff', textDecoration: nameChanged ? 'line-through' : 'none' }}>
                        {repo.name}
                      </span>
                      {nameChanged && (
                        <>
                          <ArrowRight size={11} style={{ display: 'inline', margin: '0 4px', color: 'var(--muted)', verticalAlign: 'middle' }} />
                          <span style={{ color: '#2ea043' }}>{newName}</span>
                        </>
                      )}
                    </span>
                    {repo.description && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.description}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action panel */}
        <div>
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>⚡ Hành động hàng loạt</div>

            <div style={{ marginBottom: 12 }}>
              <label>Loại hành động</label>
              <select
                value={actionType}
                onChange={e => {
                  const t = e.target.value as BulkAction;
                  setActionType(t);
                  setActionCfg({ type: t });
                  setConfirmDelete(false);
                }}
              >
                {(Object.keys(ACTION_LABELS) as BulkAction[]).map(k => (
                  <option key={k} value={k}>{ACTION_LABELS[k]}</option>
                ))}
              </select>
            </div>

            {/* Dynamic fields */}
            {actionType === 'rename_prefix' && (
              <div style={{ marginBottom: 12 }}>
                <label>Tiền tố thêm vào đầu</label>
                <input
                  type="text"
                  placeholder="vd: 2024_"
                  value={actionCfg.prefix ?? ''}
                  onChange={e => setActionCfg(c => ({ ...c, prefix: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  vd: <code style={{ background: 'var(--surface2)', padding: '0 3px', borderRadius: 3 }}>2024_</code> + <code style={{ background: 'var(--surface2)', padding: '0 3px', borderRadius: 3 }}>my-repo</code> = <code style={{ color: '#2ea043' }}>2024_my-repo</code>
                </p>
              </div>
            )}

            {actionType === 'rename_suffix' && (
              <div style={{ marginBottom: 12 }}>
                <label>Hậu tố thêm vào cuối</label>
                <input
                  type="text"
                  placeholder="vd: _archive"
                  value={actionCfg.suffix ?? ''}
                  onChange={e => setActionCfg(c => ({ ...c, suffix: e.target.value }))}
                />
              </div>
            )}

            {actionType === 'rename_replace' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label>Tìm chuỗi</label>
                  <input
                    type="text"
                    placeholder="vd: ss3_"
                    value={actionCfg.findStr ?? ''}
                    onChange={e => setActionCfg(c => ({ ...c, findStr: e.target.value }))}
                  />
                </div>
                <div>
                  <label>Thay bằng</label>
                  <input
                    type="text"
                    placeholder="vd: lab_ (để trống = xoá)"
                    value={actionCfg.replaceStr ?? ''}
                    onChange={e => setActionCfg(c => ({ ...c, replaceStr: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {actionType === 'transfer' && (
              <div style={{ marginBottom: 12 }}>
                <label>Owner mới (username hoặc org)</label>
                <input
                  type="text"
                  placeholder="vd: my-organization"
                  value={actionCfg.newOwner ?? ''}
                  onChange={e => setActionCfg(c => ({ ...c, newOwner: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>
                  ⚠ Owner mới phải có quyền nhận repo
                </p>
              </div>
            )}

            {actionType === 'visibility' && (
              <div style={{ marginBottom: 12 }}>
                <label>Đổi thành</label>
                <select
                  value={actionCfg.makePrivate ? 'private' : 'public'}
                  onChange={e => setActionCfg(c => ({ ...c, makePrivate: e.target.value === 'private' }))}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            )}

            {actionType === 'description' && (
              <div style={{ marginBottom: 12 }}>
                <label>Mô tả mới</label>
                <input
                  type="text"
                  placeholder="Mô tả repo..."
                  value={actionCfg.description ?? ''}
                  onChange={e => setActionCfg(c => ({ ...c, description: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Áp dụng cho tất cả repo đã chọn</p>
              </div>
            )}

            {/* Delete warning */}
            {actionType === 'delete' && (
              <div style={{ padding: '8px 10px', background: 'rgba(218,54,51,0.1)', border: '1px solid var(--danger)', borderRadius: 5, marginBottom: 12, fontSize: 12 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                  <AlertTriangle size={13} /> Không thể hoàn tác!
                </div>
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>Repo bị xoá sẽ mất vĩnh viễn cùng toàn bộ code và issues.</div>
              </div>
            )}

            {/* Confirm step for destructive actions */}
            {confirmDelete && (
              <div style={{ padding: '10px', background: 'rgba(218,54,51,0.15)', border: '1px solid var(--danger)', borderRadius: 5, marginBottom: 12, fontSize: 12 }}>
                <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>
                  Xác nhận {actionType === 'delete' ? 'xoá' : 'chuyển'} {selected.size} repo?
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={execute}
                    style={{ background: 'var(--danger)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
                  >
                    Xác nhận
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setConfirmDelete(false)}>
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={execute}
              disabled={running || selected.size === 0 || confirmDelete}
              className={actionType === 'delete' ? '' : 'btn-green'}
              style={actionType === 'delete' ? {
                width: '100%', padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: selected.size > 0 ? 'var(--danger)' : 'rgba(218,54,51,0.3)',
                border: 'none', borderRadius: 6, color: '#fff', cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              } : {
                width: '100%', padding: '8px 16px', fontSize: 13,
              }}
            >
              {running
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang chạy...</>
                : selected.size === 0
                  ? 'Chọn repo để bắt đầu'
                  : `${ACTION_LABELS[actionType].split(' ').slice(1).join(' ')} ${selected.size} repo`
              }
            </button>
          </div>

          {/* Preview for rename */}
          {isRenameAction && selected.size > 0 && (
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--muted)' }}>👁 Preview đổi tên ({Math.min(selected.size, 5)} / {selected.size})</div>
              {selectedList.slice(0, 5).map(r => {
                const newN = previewNewName(r.name);
                return (
                  <div key={r.name} style={{ fontSize: 11, fontFamily: 'monospace', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'var(--muted)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{r.name}</span>
                    <ArrowRight size={10} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span style={{ color: newN !== r.name ? '#2ea043' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{newN}</span>
                  </div>
                );
              })}
              {selected.size > 5 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>... và {selected.size - 5} repo nữa</span>}
            </div>
          )}
        </div>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: showLogs ? 10 : 0 }}
            onClick={() => setShowLogs(v => !v)}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {running ? '⏳ Đang xử lý...' : '✅ Kết quả'}
            </span>
            <span style={{ fontSize: 12, color: '#2ea043' }}>✓ {okCount}</span>
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>✗ {errCount}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{okCount + errCount}/{logs.length}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
              {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginBottom: showLogs ? 10 : 0, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #238636, #2ea043)',
              borderRadius: 2,
              width: `${logs.length > 0 ? Math.round(((okCount + errCount) / logs.length) * 100) : 0}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>

          {showLogs && (
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {logs.map(log => (
                <div key={log.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 0', borderBottom: '1px solid var(--surface2)',
                  fontFamily: 'monospace', fontSize: 12,
                }}>
                  <span style={{ flexShrink: 0, color: log.status === 'ok' ? '#2ea043' : log.status === 'error' ? 'var(--danger)' : log.status === 'running' ? 'var(--blue)' : 'var(--muted)' }}>
                    {log.status === 'ok' && <CheckCircle size={13} />}
                    {log.status === 'error' && <XCircle size={13} />}
                    {log.status === 'running' && <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                    {(log.status === 'pending' || log.status === 'skip') && <Clock size={13} />}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: '#79c0ff' }}>{log.name}</strong>
                    <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{log.message}</span>
                  </span>
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