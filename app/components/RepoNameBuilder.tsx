'use client';
import { useState } from 'react';
import { Plus, X, Hash, List, AlignLeft } from 'lucide-react';
import { CreationMode } from '@/app/types';

interface Props {
  mode: CreationMode;
  onModeChange: (m: CreationMode) => void;
  baseName: string;
  onBaseNameChange: (v: string) => void;
  rangeFrom: number;
  rangeTo: number;
  onRangeFromChange: (v: number) => void;
  onRangeToChange: (v: number) => void;
  manualNames: string[];
  onManualNamesChange: (v: string[]) => void;
  freeText: string;
  onFreeTextChange: (v: string) => void;
  username: string;
}

const MODES: { id: CreationMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'range', label: 'Dãy số', icon: <Hash size={13} />, desc: 'VD: repo1, repo2, ...' },
  { id: 'manual', label: 'Nhập tay', icon: <List size={13} />, desc: 'Thêm từng tên' },
  { id: 'free', label: 'Tự do', icon: <AlignLeft size={13} />, desc: 'Dán danh sách' },
];

export default function RepoNameBuilder({
  mode, onModeChange, baseName, onBaseNameChange,
  rangeFrom, rangeTo, onRangeFromChange, onRangeToChange,
  manualNames, onManualNamesChange, freeText, onFreeTextChange,
  username
}: Props) {
  function getPreviewNames(): string[] {
    if (mode === 'range') {
      const from = Math.min(rangeFrom, rangeTo);
      const to = Math.max(rangeFrom, rangeTo);
      const count = to - from + 1;
      if (!baseName.trim() || count > 500) return [];
      return Array.from({ length: count }, (_, i) => baseName.trim() + (from + i));
    }
    if (mode === 'manual') return manualNames.filter(n => n.trim());
    return freeText.split('\n').map(s => s.trim()).filter(Boolean);
  }

  const names = getPreviewNames();
  const count = names.length;
  const preview = names.slice(0, 5);
  const rest = count - 5;

  function updateManual(idx: number, val: string) {
    const copy = [...manualNames];
    copy[idx] = val;
    onManualNamesChange(copy);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Tên Repo</div>
        {count > 0 && (
          <span style={{ padding: '3px 10px', background: 'var(--accent-dim)', border: '1px solid rgba(61,126,255,0.2)', borderRadius: 100, fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
            {count} repo
          </span>
        )}
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, padding: 4, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
        {MODES.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 7,
              border: 'none',
              background: mode === id ? 'var(--surface2)' : 'transparent',
              color: mode === id ? 'var(--text)' : 'var(--text3)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: mode === id ? 600 : 400,
              fontFamily: 'inherit',
              transition: 'all 0.18s',
              boxShadow: mode === id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Range mode */}
      {mode === 'range' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 10 }}>
          <div>
            <label>Tên cơ sở</label>
            <input type="text" value={baseName} onChange={e => onBaseNameChange(e.target.value)} placeholder="ss3_bai" />
          </div>
          <div>
            <label>Từ</label>
            <input type="number" value={rangeFrom} min={0} onChange={e => onRangeFromChange(Number(e.target.value))} />
          </div>
          <div>
            <label>Đến</label>
            <input type="number" value={rangeTo} min={0} onChange={e => onRangeToChange(Number(e.target.value))} />
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {manualNames.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)', minWidth: 20, textAlign: 'right' }}>{i + 1}</span>
                <input type="text" value={n} onChange={e => updateManual(i, e.target.value)} placeholder={`repo-${i + 1}`} />
                <button
                  onClick={() => onManualNamesChange(manualNames.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 6, flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,77,106,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn-ghost"
            onClick={() => onManualNamesChange([...manualNames, ''])}
            style={{ fontSize: 12, width: '100%', justifyContent: 'center' }}
          >
            <Plus size={13} /> Thêm repo
          </button>
        </div>
      )}

      {/* Free mode */}
      {mode === 'free' && (
        <div>
          <label>Mỗi dòng là một tên repo</label>
          <textarea
            value={freeText}
            onChange={e => onFreeTextChange(e.target.value)}
            placeholder={"ss3_bai1\nss3_bai2\nproject_final\nhomework_03"}
            style={{ minHeight: 130, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7 }}
          />
        </div>
      )}

      {/* Preview */}
      {count > 0 && (
        <div style={{ marginTop: 14, background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>
            Xem trước
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {preview.map(n => (
              <div key={n} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text3)', fontSize: 10 }}>github.com/</span>
                <span style={{ color: 'var(--text3)' }}>{username || 'username'}/</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{n}</span>
              </div>
            ))}
            {rest > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>
                ... và {rest} repo nữa
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}