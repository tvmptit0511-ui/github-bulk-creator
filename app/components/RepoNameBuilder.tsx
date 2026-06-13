'use client';
import { useState } from 'react';
import { Plus, X, Hash, List, AlignLeft, ChevronDown } from 'lucide-react';
import { CreationMode } from '@/app/types';
import { OrgInfo } from '@/app/lib/github';

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
  // Owner / Org
  orgs: OrgInfo[];
  orgsLoading: boolean;
  selectedOrg: string;
  onOrgChange: (org: string) => void;
}

const MODES: { id: CreationMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'range', label: 'Dãy số', icon: <Hash size={13} />, desc: 'VD: repo1, repo2, ...' },
  { id: 'manual', label: 'Nhập tay', icon: <List size={13} />, desc: 'Thêm từng tên' },
  { id: 'free', label: 'Tự do', icon: <AlignLeft size={13} />, desc: 'Dán danh sách' },
];

export default function RepoNameBuilder({
  mode, onModeChange,
  baseName, onBaseNameChange,
  rangeFrom, rangeTo,
  onRangeFromChange, onRangeToChange,
  manualNames, onManualNamesChange,
  freeText, onFreeTextChange,
  username,
  orgs, orgsLoading, selectedOrg, onOrgChange,
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

  // Owner hiển thị trong preview
  const ownerDisplay = selectedOrg || username || 'username';

  // Avatar của owner đang chọn
  const selectedOrgInfo = orgs.find(o => o.login === selectedOrg);

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

      {/* ── Owner dropdown ── */}
      {username && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ marginBottom: 6, display: 'block', fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
            Owner
          </label>
          {orgsLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 0' }}>
              Đang tải tổ chức...
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Avatar hiển thị bên trái select */}
              <div style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1,
              }}>
                {selectedOrgInfo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedOrgInfo.avatar_url} alt={selectedOrgInfo.login} width={18} height={18} style={{ borderRadius: '50%' }} />
                ) : (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--green))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff',
                  }}>
                    {(username[0] ?? '?').toUpperCase()}
                  </div>
                )}
              </div>
              <select
                value={selectedOrg}
                onChange={e => onOrgChange(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 36,
                  paddingRight: 32,
                  appearance: 'none',
                }}
              >
                <option value="">{username} (cá nhân)</option>
                {orgs.map(o => (
                  <option key={o.login} value={o.login}>{o.login} (org)</option>
                ))}
              </select>
              <ChevronDown size={13} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: 'var(--text2)',
              }} />
            </div>
          )}
        </div>
      )}

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

      {/* Preview — URL đổi theo owner */}
      {count > 0 && (
        <div style={{ marginTop: 14, background: 'var(--bg2)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 8 }}>Xem trước</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {preview.map(n => (
              <div key={n} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text3)', fontSize: 10 }}>github.com/</span>
                <span style={{ color: 'var(--text3)' }}>{ownerDisplay}/</span>
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