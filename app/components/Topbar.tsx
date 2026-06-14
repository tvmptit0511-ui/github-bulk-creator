'use client';
import { Bell, Search, Settings } from 'lucide-react';

type Page = 'dashboard' | 'creator' | 'manager' | 'history' | 'guide';

const PAGE_LABELS: Record<Page, { section: string; current: string }> = {
  dashboard: { section: 'GitHub Bulk Creator', current: 'Dashboard' },
  creator: { section: 'Repo Creator', current: 'Create New' },
  manager: { section: 'Repo Creator', current: 'Manage Repos' },
  history: { section: 'Repo Creator', current: 'History' },
  guide: { section: 'Hướng dẫn', current: 'Hướng dẫn sử dụng' },
};

interface Props {
  activePage: Page;
  username?: string;
  avatarUrl?: string;
}

export default function Topbar({ activePage, username, avatarUrl }: Props) {
  const labels = PAGE_LABELS[activePage];

  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <span>{labels.section}</span>
        <span className="sep">/</span>
        <span className="current">{labels.current}</span>
      </div>

      <div className="topbar-actions">
        <button className="btn-icon" title="Tìm kiếm">
          <Search size={14} />
        </button>
        <button className="btn-icon" title="Thông báo">
          <Bell size={14} />
        </button>
        <button className="btn-icon" title="Cài đặt">
          <Settings size={14} />
        </button>
        <div className="topbar-avatar" title={username || 'Guest'}>
          {avatarUrl
            ? <img src={avatarUrl} alt={username} />
            : (username ? username[0].toUpperCase() : 'G')
          }
        </div>
      </div>
    </div>
  );
}