'use client';
import { CheckCircle, XCircle, Loader, Clock, ExternalLink } from 'lucide-react';
import { LogItem } from '@/app/types';

interface Props {
  logs: LogItem[];
  total: number;
  okCount: number;
  errCount: number;
  running: boolean;
}

export default function LogPanel({ logs, total, okCount, errCount, running }: Props) {
  const done = okCount + errCount;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (logs.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {running ? 'Đang tạo...' : 'Hoàn tất'}
        </span>
        <span style={{ fontSize: 12, color: '#2ea043' }}>✓ {okCount}</span>
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>✗ {errCount}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done}/{total}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{pct}%</span>
      </div>

      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div className="progress-bar-inner" style={{ width: `${pct}%` }} />
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {logs.map(log => (
          <div key={log.name} className="log-item" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--surface2)' }}>
            <span style={{ flexShrink: 0, color: log.status === 'ok' ? '#2ea043' : log.status === 'error' ? 'var(--danger)' : log.status === 'running' ? 'var(--blue)' : 'var(--muted)' }}>
              {log.status === 'ok' && <CheckCircle size={13} />}
              {log.status === 'error' && <XCircle size={13} />}
              {log.status === 'running' && <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />}
              {(log.status === 'pending' || log.status === 'skip') && <Clock size={13} />}
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
              <strong style={{ color: '#79c0ff' }}>{log.name}</strong>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{log.message}</span>
            </span>
            {log.url && (
              <a href={log.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', flexShrink: 0, display: 'flex' }}>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
