'use client';
import { useState, useEffect } from 'react';
import { Trash2, ExternalLink, ChevronDown, ChevronRight, Clock, GitBranch } from 'lucide-react';
import { HistoryEntry } from '@/app/types';
import { getHistory, deleteHistory, clearHistory } from '@/app/lib/storage';

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { setHistory(getHistory()); }, []);

  function del(id: string) { deleteHistory(id); setHistory(getHistory()); }

  function clear() {
    if (!confirm('Xoá toàn bộ lịch sử?')) return;
    clearHistory();
    setHistory([]);
  }

  function toggle(id: string) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (history.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
        <div style={{ width: 56, height: 56, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Clock size={24} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>Chưa có lịch sử</div>
        <div style={{ fontSize: 13 }}>Các lần tạo repo sẽ xuất hiện ở đây</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--blue-bright)' }}>{history.length}</span> phiên
        </div>
        <button className="btn btn-danger" onClick={clear} style={{ fontSize: 12, padding: '5px 12px' }}>
          <Trash2 size={12} /> Xoá tất cả
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map(entry => {
          const ok = entry.results.filter(r => r.status === 'ok').length;
          const err = entry.results.filter(r => r.status === 'err').length;
          const open = expanded.has(entry.id);

          return (
            <div key={entry.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggle(entry.id)}>
                <span style={{ color: 'var(--text3)', display: 'flex' }}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                <div style={{ width: 30, height: 30, background: 'var(--surface2)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GitBranch size={13} color="var(--text3)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>
                    <span style={{ color: 'var(--blue-bright)', fontFamily: 'JetBrains Mono, monospace' }}>@{entry.username}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(entry.timestamp)}</div>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span className="badge badge-green">✓ {ok}</span>
                  {err > 0 && <span className="badge badge-red">✗ {err}</span>}
                  <span className="badge badge-gray">{entry.repos.length} repo</span>
                </div>
                <button onClick={e => { e.stopPropagation(); del(entry.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4, borderRadius: 5, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                  <Trash2 size={13} />
                </button>
              </div>

              {open && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', background: 'var(--bg2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {entry.results.map(r => (
                      <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 5, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                        <span style={{ color: r.status === 'ok' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>{r.status === 'ok' ? '✓' : '✗'}</span>
                        <span style={{ flex: 1, color: r.status === 'ok' ? 'var(--text2)' : 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-bright)', display: 'flex', opacity: 0.7 }}>
                            <ExternalLink size={11} />
                          </a>
                        )}
                        {r.error && <span style={{ color: 'var(--text3)', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}