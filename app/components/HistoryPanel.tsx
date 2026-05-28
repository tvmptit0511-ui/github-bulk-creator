'use client';
import { useState, useEffect } from 'react';
import { Trash2, ExternalLink, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { HistoryEntry } from '@/app/types';
import { getHistory, deleteHistory, clearHistory } from '@/app/lib/storage';

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { setHistory(getHistory()); }, []);

  function del(id: string) {
    deleteHistory(id);
    setHistory(getHistory());
  }

  function clear() {
    if (!confirm('Xoá toàn bộ lịch sử?')) return;
    clearHistory();
    setHistory([]);
  }

  function toggle(id: string) {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (history.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <Clock size={32} style={{ color: 'var(--muted)', margin: '0 auto 8px' }} />
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Chưa có lịch sử tạo repo</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{history.length} phiên</span>
        <button className="btn-ghost" onClick={clear} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          <Trash2 size={12} /> Xoá tất cả
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map(entry => {
          const ok = entry.results.filter(r => r.status === 'ok').length;
          const err = entry.results.filter(r => r.status === 'err').length;
          const open = expanded.has(entry.id);
          return (
            <div key={entry.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggle(entry.id)}>
                <span style={{ color: 'var(--muted)' }}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                <span style={{ fontSize: 13, flex: 1 }}>
                  <strong style={{ color: '#79c0ff' }}>@{entry.username}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{formatDate(entry.timestamp)}</span>
                </span>
                <span style={{ fontSize: 12, color: '#2ea043' }}>✓{ok}</span>
                {err > 0 && <span style={{ fontSize: 12, color: 'var(--danger)' }}>✗{err}</span>}
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.repos.length} repo</span>
                <button onClick={e => { e.stopPropagation(); del(entry.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2 }}>
                  <Trash2 size={13} />
                </button>
              </div>

              {open && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {entry.results.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontFamily: 'monospace', fontSize: 12 }}>
                      <span style={{ color: r.status === 'ok' ? '#2ea043' : 'var(--danger)' }}>
                        {r.status === 'ok' ? '✓' : '✗'}
                      </span>
                      <span style={{ flex: 1, color: r.status === 'ok' ? 'var(--text)' : 'var(--danger)' }}>{r.name}</span>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', display: 'flex' }}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                      {r.error && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
