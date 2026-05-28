'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
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
  const preview = names.slice(0, 6);
  const rest = count - 6;

  function updateManual(idx: number, val: string) {
    const copy = [...manualNames];
    copy[idx] = val;
    onManualNamesChange(copy);
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Tên Repo</div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {([['range', 'Dãy số'], ['manual', 'Nhập tay'], ['free', 'Tự do']] as [CreationMode, string][]).map(([m, label]) => (
          <button key={m} className={`tab ${mode === m ? 'active' : ''}`} onClick={() => onModeChange(m)}>{label}</button>
        ))}
      </div>

      {mode === 'range' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end', marginBottom: 12 }}>
            <div>
              <label>Tên cơ sở</label>
              <input type="text" value={baseName} onChange={e => onBaseNameChange(e.target.value)} placeholder="ss3_bai" />
            </div>
            <div>
              <label>Từ</label>
              <input type="number" value={rangeFrom} min={0} onChange={e => onRangeFromChange(Number(e.target.value))} style={{ width: 72 }} />
            </div>
            <div>
              <label>Đến</label>
              <input type="number" value={rangeTo} min={0} onChange={e => onRangeToChange(Number(e.target.value))} style={{ width: 72 }} />
            </div>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {manualNames.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input type="text" value={n} onChange={e => updateManual(i, e.target.value)} placeholder={`repo-${i + 1}`} />
                <button className="btn-ghost" onClick={() => onManualNamesChange(manualNames.filter((_, j) => j !== i))} style={{ padding: '5px 10px', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => onManualNamesChange([...manualNames, ''])} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={13} /> Thêm repo
          </button>
        </div>
      )}

      {mode === 'free' && (
        <div>
          <label>Mỗi dòng là một tên repo</label>
          <textarea value={freeText} onChange={e => onFreeTextChange(e.target.value)} placeholder={"ss3_bai1\nss3_bai2\nproject_final\nhomework_03"} style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 13 }} />
        </div>
      )}

      {count > 0 && (
        <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            Sẽ tạo <strong style={{ color: 'var(--text)' }}>{count}</strong> repo:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {preview.map(n => (
              <span key={n} style={{ fontFamily: 'monospace', fontSize: 12, color: '#79c0ff' }}>
                https://github.com/{username || 'username'}/{n}
              </span>
            ))}
            {rest > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>... và {rest} repo nữa</span>}
          </div>
        </div>
      )}
    </div>
  );
}
