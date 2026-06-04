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
    <div className="card animate-fadein" style={{ marginTop: 4 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
            {running ? '⚡ Đang xử lý...' : done === total && errCount === 0 ? '✅ Hoàn tất' : done === total ? '⚠ Hoàn tất có lỗi' : 'Kết quả'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>
            {done}/{total} · {pct}%
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {okCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--green-dim)', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 100, fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
              <CheckCircle size={11} /> {okCount}
            </span>
          )}
          {errCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--red-dim)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 100, fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>
              <XCircle size={11} /> {errCount}
            </span>
          )}
          {running && pending > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 100, fontSize: 12, color: 'var(--text3)' }}>
              <Clock size={11} /> {pending}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 10, marginBottom: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div className="progress-bar-inner" style={{ width: `${pct}%`, height: '100%', borderRadius: 10 }} />
      </div>

      {/* Log list */}
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 4 }}>
        {logs.map((log, i) => {
          const statusColor =
            log.status === 'ok' ? 'var(--green)' :
            log.status === 'error' ? 'var(--red)' :
            log.status === 'running' ? 'var(--accent)' :
            'var(--text3)';

          const rowBg =
            log.status === 'ok' ? 'rgba(0,214,143,0.04)' :
            log.status === 'error' ? 'rgba(255,77,106,0.04)' :
            log.status === 'running' ? 'rgba(61,126,255,0.05)' :
            'transparent';

          return (
            <div
              key={log.name}
              className="log-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                borderRadius: 7,
                background: rowBg,
                border: `1px solid ${log.status === 'running' ? 'rgba(61,126,255,0.15)' : 'transparent'}`,
                transition: 'background 0.2s',
              }}
            >
              <span style={{ flexShrink: 0, color: statusColor, display: 'flex', alignItems: 'center' }}>
                {log.status === 'ok' && <CheckCircle size={12} />}
                {log.status === 'error' && <XCircle size={12} />}
                {log.status === 'running' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                {(log.status === 'pending' || log.status === 'skip') && <Clock size={12} />}
              </span>

              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--accent)', flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.name}
              </span>

              <span style={{ flex: 1, fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.message}
              </span>

              {log.url && (
                <a href={log.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex', opacity: 0.8, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                >
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