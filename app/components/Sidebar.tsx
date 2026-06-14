'use client';
import { LayoutDashboard, Wrench, History, HelpCircle, Zap, ChevronRight } from 'lucide-react';

type Page = 'dashboard' | 'creator' | 'manager' | 'history' | 'guide';

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
  username?: string;
  avatarUrl?: string;
  repoCount?: number;
}

const navItems: { id: Page; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'creator', label: 'Repo Creator', icon: <Zap size={15} /> },
  { id: 'manager', label: 'Quản lý', icon: <Wrench size={15} /> },
  { id: 'history', label: 'Lịch sử', icon: <History size={15} /> },
  { id: 'guide', label: 'Hướng dẫn', icon: <HelpCircle size={15} /> },
];

export default function Sidebar({ activePage, onNavigate, username, avatarUrl, repoCount }: Props) {
  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="TVM Logo" />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">Trần Văn Mỹ</div>
          <div className="sidebar-logo-sub">Full Stack · AI Dev</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>

        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.id === 'manager' && repoCount ? (
              <span className="nav-badge">{repoCount}</span>
            ) : null}
            {activePage === item.id && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
          </button>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 16 }}>Tài khoản</div>

        <button
          className="nav-item"
          style={{ cursor: 'default', opacity: 0.8 }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
            : <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--blue-dim)', border: '1px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--blue-bright)' }}>
                {username ? username[0].toUpperCase() : '?'}
              </div>
          }
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username ? `@${username}` : 'Chưa đăng nhập'}
          </span>
        </button>
      </div>
    </nav>
  );
}