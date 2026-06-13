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
  const pending = total - done;

  if (logs.length === 0) return null;

  return (
    <div className="card animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 1 }}>
            {running ? '⚡ Đang xử lý...' : done === total && errCount === 0 ? '✅ Hoàn tất' : done === total ? '⚠ Hoàn tất có lỗi' : 'Kết quả'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {done}/{total} · {pct}%
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {okCount > 0 && <span className="badge badge-green"><CheckCircle size={10} /> {okCount}</span>}
          {errCount > 0 && <span className="badge badge-red"><XCircle size={10} /> {errCount}</span>}
          {running && pending > 0 && <span className="badge badge-gray"><Clock size={10} /> {pending}</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: 12 }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Log list */}
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 2 }}>
        {logs.map(log => {
          const statusColor =
            log.status === 'ok' ? 'var(--green)' :
            log.status === 'error' ? 'var(--red)' :
            log.status === 'running' ? 'var(--blue-bright)' : 'var(--text3)';

          return (
            <div key={log.name} className={`log-row${log.status === 'running' ? ' running' : log.status === 'ok' ? ' ok' : log.status === 'error' ? ' error' : ''}`}>
              <span style={{ flexShrink: 0, color: statusColor, display: 'flex', alignItems: 'center' }}>
                {log.status === 'ok' && <CheckCircle size={12} />}
                {log.status === 'error' && <XCircle size={12} />}
                {log.status === 'running' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                {(log.status === 'pending' || log.status === 'skip') && <Clock size={12} />}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--blue-bright)', flexShrink: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.name}
              </span>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.message}
              </span>
              {log.url && (
                <a href={log.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-bright)', flexShrink: 0, display: 'flex', opacity: 0.7 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}