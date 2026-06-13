'use client';
import { GitBranch, Zap, CheckCircle, Clock, TrendingUp, Plus, Wrench, ArrowRight, Activity, Star } from 'lucide-react';
import { HistoryEntry } from '@/app/types';

interface Props {
  username: string;
  avatarUrl: string;
  history: HistoryEntry[];
  onNavigate: (page: 'creator' | 'manager' | 'history') => void;
}

export default function DashboardPage({ username, avatarUrl, history, onNavigate }: Props) {
  const totalRepos = history.reduce((s, e) => s + e.repos.length, 0);
  const totalOk = history.reduce((s, e) => s + e.results.filter(r => r.status === 'ok').length, 0);
  const totalErr = history.reduce((s, e) => s + e.results.filter(r => r.status === 'err').length, 0);
  const successRate = totalRepos > 0 ? Math.round((totalOk / totalRepos) * 100) : 0;

  const recentSessions = history.slice(0, 5);

  function formatDate(ts: number) {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {avatarUrl && (
            <img src={avatarUrl} alt={username} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border2)' }} />
          )}
          <div>
            <div className="section-title">
              {username ? `Chào, @${username} 👋` : 'GitHub Bulk Creator'}
            </div>
            <div className="section-sub">Quản lý và tạo GitHub repos nhanh chóng</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--blue-bright)' }}>{totalRepos}</div>
              <div className="stat-label">Tổng repo tạo</div>
            </div>
            <div style={{ padding: 8, background: 'var(--blue-dim)', borderRadius: 8 }}>
              <GitBranch size={16} style={{ color: 'var(--blue-bright)' }} />
            </div>
          </div>
          <div className="stat-change" style={{ color: 'var(--blue-bright)' }}>
            <TrendingUp size={11} />
            {history.length} phiên tạo
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{totalOk}</div>
              <div className="stat-label">Thành công</div>
            </div>
            <div style={{ padding: 8, background: 'var(--green-dim)', borderRadius: 8 }}>
              <CheckCircle size={16} style={{ color: 'var(--green)' }} />
            </div>
          </div>
          <div className="stat-change" style={{ color: 'var(--green)' }}>
            <TrendingUp size={11} />
            Tỉ lệ {successRate}%
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{totalErr}</div>
              <div className="stat-label">Lỗi</div>
            </div>
            <div style={{ padding: 8, background: 'var(--red-dim)', borderRadius: 8 }}>
              <Activity size={16} style={{ color: 'var(--red)' }} />
            </div>
          </div>
          <div className="stat-change" style={{ color: 'var(--text2)' }}>
            Cần kiểm tra lại
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--purple)' }}>{history.length}</div>
              <div className="stat-label">Phiên làm việc</div>
            </div>
            <div style={{ padding: 8, background: 'var(--purple-dim)', borderRadius: 8 }}>
              <Clock size={16} style={{ color: 'var(--purple)' }} />
            </div>
          </div>
          <div className="stat-change" style={{ color: 'var(--text2)' }}>
            Tổng lịch sử
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Recent activity */}
        <div>
          <div className="card">
            <div className="card-header">
              <Clock size={15} style={{ color: 'var(--text2)' }} />
              <span className="card-title">Hoạt động gần đây</span>
              <button onClick={() => onNavigate('history')} className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>
                Xem tất cả <ArrowRight size={11} />
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)' }}>
                <GitBranch size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Chưa có hoạt động</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Hãy tạo repo đầu tiên của bạn!</div>
                <button onClick={() => onNavigate('creator')} className="btn btn-primary" style={{ marginTop: 16, fontSize: 13 }}>
                  <Plus size={13} /> Tạo Repo ngay
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentSessions.map(entry => {
                  const ok = entry.results.filter(r => r.status === 'ok').length;
                  const err = entry.results.filter(r => r.status === 'err').length;
                  return (
                    <div key={entry.id} onClick={() => onNavigate('history')} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px',
                      background: 'var(--surface2)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background var(--transition)',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GitBranch size={14} style={{ color: 'var(--blue-bright)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                          <span style={{ color: 'var(--blue-bright)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>@{entry.username}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {entry.repos.length} repo · {formatDate(entry.timestamp)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ok > 0 && <span className="badge badge-green">✓ {ok}</span>}
                        {err > 0 && <span className="badge badge-red">✗ {err}</span>}
                      </div>
                      <ArrowRight size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-header">
              <Zap size={15} style={{ color: 'var(--text2)' }} />
              <span className="card-title">Thao tác nhanh</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => onNavigate('creator')} className="quick-action">
                <div className="quick-action-icon" style={{ background: 'var(--blue-dim)' }}>
                  <Plus size={16} style={{ color: 'var(--blue-bright)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Tạo Repo Mới</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Bulk create repos</div>
                </div>
              </button>

              <button onClick={() => onNavigate('manager')} className="quick-action">
                <div className="quick-action-icon" style={{ background: 'var(--purple-dim)' }}>
                  <Wrench size={16} style={{ color: 'var(--purple)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Quản lý Repos</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Rename, delete, transfer</div>
                </div>
              </button>

              <button onClick={() => onNavigate('history')} className="quick-action">
                <div className="quick-action-icon" style={{ background: 'var(--yellow-dim)' }}>
                  <Clock size={16} style={{ color: 'var(--orange)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Lịch sử</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Xem các phiên tạo</div>
                </div>
              </button>
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(31,111,235,0.1), rgba(188,140,255,0.08))', borderColor: 'rgba(31,111,235,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Star size={14} style={{ color: 'var(--orange)' }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Mẹo sử dụng</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              Dùng chế độ <strong style={{ color: 'var(--blue-bright)' }}>Dãy số</strong> để tạo nhanh nhiều repo theo cấu trúc tên có số thứ tự (vd: <code>ss3_bai1</code> → <code>ss3_bai10</code>).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}