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

export default function RepoNameBuilder({ mode, onModeChange, baseName, onBaseNameChange, rangeFrom, rangeTo, onRangeFromChange, onRangeToChange, manualNames, onManualNamesChange, freeText, onFreeTextChange, username }: Props) {
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
      <div className="card-header">
        <span className="card-title">Tên Repo</span>
        {count > 0 && (
          <span className="badge badge-blue">{count} repo</span>
        )}
      </div>

      {/* Mode selector */}
      <div className="mode-tabs">
        {MODES.map(({ id, label, icon }) => (
          <button key={id} onClick={() => onModeChange(id)} className={`mode-tab${mode === id ? ' active' : ''}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Range mode */}
      {mode === 'range' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 10 }}>
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
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text3)', minWidth: 20, textAlign: 'right' }}>{i + 1}</span>
                <input type="text" value={n} onChange={e => updateManual(i, e.target.value)} placeholder={`repo-${i + 1}`} />
                <button onClick={() => onManualNamesChange(manualNames.filter((_, j) => j !== i))} className="btn-icon" style={{ flexShrink: 0, border: 'none' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={() => onManualNamesChange([...manualNames, ''])} style={{ fontSize: 12, width: '100%', justifyContent: 'center' }}>
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
            style={{ minHeight: 120, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.7 }}
          />
        </div>
      )}

      {/* Preview */}
      {count > 0 && (
        <div style={{ marginTop: 14, background: 'var(--bg2)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 8 }}>Xem trước</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {preview.map(n => (
              <div key={n} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text3)', fontSize: 10 }}>github.com/</span>
                <span style={{ color: 'var(--text3)' }}>{username || 'username'}/</span>
                <span style={{ color: 'var(--blue-bright)', fontWeight: 500 }}>{n}</span>
              </div>
            ))}
            {rest > 0 && <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>... và {rest} repo nữa</div>}
          </div>
        </div>
      )}
    </div>
  );
}