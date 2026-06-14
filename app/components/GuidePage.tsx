'use client';
import {
  Key, Zap, Wrench, GitBranch, Upload, Building2,
  CheckCircle2, AlertCircle, ChevronRight, ExternalLink, Shield
} from 'lucide-react';

interface Step {
  num: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
  detail: React.ReactNode;
}
const codeStyle: React.CSSProperties = {
  background: 'var(--surface2, rgba(255,255,255,0.06))',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 12,
  fontFamily: 'monospace',
};

const tipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 7,
  padding: '8px 10px',
  borderRadius: 6,
  background: 'rgba(210,153,34,0.08)',
  border: '1px solid rgba(210,153,34,0.25)',
  fontSize: 12,
  color: 'var(--text2)',
  lineHeight: 1.5,
};

const steps: Step[] = [
  {
    num: 1,
    icon: <Key size={16} />,
    title: 'Tạo GitHub Token',
    desc: 'Lấy Personal Access Token từ GitHub để xác thực',
    detail: (
      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li>Truy cập <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>github.com/settings/tokens <ExternalLink size={11} /></a></li>
        <li>Đặt tên token (vd: <code style={codeStyle}>bulk-creator</code>)</li>
        <li>Chọn scope: <code style={codeStyle}>repo</code> (toàn bộ quyền repo) và <code style={codeStyle}>read:org</code> (nếu dùng tổ chức)</li>
        <li>Nhấn <strong>Generate token</strong> và copy lại</li>
      </ol>
    ),
  },
  {
    num: 2,
    icon: <Shield size={16} />,
    title: 'Xác thực tài khoản',
    desc: 'Nhập token vào ô xác thực trên trang Repo Creator',
    detail: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>Trên trang <strong>Repo Creator</strong>, tìm card <em>"GitHub Authentication"</em>:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>Dán token vào ô input</li>
          <li>Nhấn <strong>Xác thực</strong> — avatar và username sẽ hiện ra nếu thành công</li>
          <li>Nếu bạn thuộc tổ chức (Org), danh sách org sẽ tự động tải</li>
        </ul>
        <div style={tipStyle}>
          <AlertCircle size={13} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
          Token được lưu trong session, không gửi ra ngoài ngoài GitHub API.
        </div>
      </div>
    ),
  },
  {
    num: 3,
    icon: <GitBranch size={16} />,
    title: 'Đặt tên Repo',
    desc: 'Chọn chế độ đặt tên phù hợp với nhu cầu của bạn',
    detail: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          {
            label: 'Dãy số',
            badge: 'Phổ biến nhất',
            badgeColor: 'var(--green)',
            desc: 'Nhập tên gốc + khoảng số. VD: baseName = "ss3_bai", từ 1 đến 10 → tạo ss3_bai1 … ss3_bai10',
          },
          {
            label: 'Nhập tay',
            badge: 'Linh hoạt',
            badgeColor: 'var(--accent)',
            desc: 'Thêm từng tên repo riêng lẻ vào danh sách.',
          },
          {
            label: 'Văn bản tự do',
            badge: 'Nhanh nhất',
            badgeColor: 'var(--purple, #a371f7)',
            desc: 'Paste danh sách tên repo (mỗi dòng một cái), ví dụ copy từ file txt.',
          },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, background: m.badgeColor + '22', color: m.badgeColor, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', marginTop: 2 }}>{m.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{m.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: 4,
    icon: <Building2 size={16} />,
    title: 'Chọn Owner (tuỳ chọn)',
    desc: 'Tạo repo dưới cá nhân hoặc tổ chức GitHub',
    detail: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>Sau khi xác thực, dropdown <strong>Owner</strong> sẽ hiện các lựa chọn:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li><strong>Cá nhân</strong>: repo tạo dưới <code style={codeStyle}>@username</code></li>
          <li><strong>Tổ chức</strong>: repo tạo dưới org (cần quyền <code style={codeStyle}>repo</code> trong org đó)</li>
        </ul>
      </div>
    ),
  },
  {
    num: 5,
    icon: <Upload size={16} />,
    title: 'Đính kèm file (tuỳ chọn)',
    desc: 'Upload file vào tất cả hoặc từng repo riêng lẻ',
    detail: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(31,111,235,0.12)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>Shared</span>
          <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>File đính kèm vào <em>tất cả</em> repo được tạo (vd: README template, .gitignore)</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(63,185,80,0.12)', color: 'var(--green)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>Per-Repo</span>
          <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>Mở rộng từng repo trong danh sách để upload file riêng — file per-repo ghi đè shared nếu trùng tên</span>
        </div>
        <div style={tipStyle}>
          <AlertCircle size={13} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
          Cần bật <strong>README tự động</strong> (Auto Init) để upload file hoạt động.
        </div>
      </div>
    ),
  },
  {
    num: 6,
    icon: <Zap size={16} />,
    title: 'Tạo Repo',
    desc: 'Nhấn nút Tạo và theo dõi tiến trình trong Log Panel',
    detail: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>Kiểm tra lại: số repo, owner, visibility trước khi nhấn</li>
          <li><strong>Log Panel</strong> hiển thị trạng thái từng repo theo thời gian thực</li>
          <li>Kết quả được lưu vào <strong>Lịch sử</strong> sau khi hoàn tất</li>
          <li>Điều chỉnh <strong>Delay</strong> (ms) nếu gặp lỗi rate limit từ GitHub</li>
        </ul>
        <div style={{ ...tipStyle, borderColor: 'rgba(63,185,80,0.3)', background: 'rgba(63,185,80,0.06)' }}>
          <CheckCircle2 size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
          Tạo trên 100 repo sẽ có hộp thoại xác nhận để tránh tạo nhầm.
        </div>
      </div>
    ),
  },
];



const faqs = [
  {
    q: 'Token của tôi có an toàn không?',
    a: 'Token chỉ được lưu trong bộ nhớ trình duyệt (React state) trong phiên hiện tại và chỉ được gửi trực tiếp đến GitHub API. Khi reload trang, token sẽ bị xoá.',
  },
  {
    q: 'Tôi có thể tạo bao nhiêu repo một lần?',
    a: 'Về mặt kỹ thuật không giới hạn, nhưng GitHub có rate limit ~5,000 requests/giờ. Khuyến khích tối đa 100 repo/lần và tăng delay lên 500ms+ nếu tạo nhiều.',
  },
  {
    q: 'Tại sao upload file thất bại?',
    a: 'File upload yêu cầu repo phải có ít nhất 1 commit (auto-init README). Hãy đảm bảo bật "README tự động" trong Cài đặt Repo.',
  },
  {
    q: 'Tôi có thể xoá repo hàng loạt không?',
    a: 'Có! Vào trang Quản lý → chọn nhiều repo → nhấn Xoá. Lưu ý thao tác này không thể hoàn tác.',
  },
];

export default function GuidePage() {
  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title">Hướng dẫn sử dụng</div>
        <div className="section-sub">Từng bước để tạo hàng loạt GitHub repository chỉ trong vài giây</div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {steps.map((step, i) => (
          <div key={step.num} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Step number */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'var(--blue-dim, rgba(31,111,235,0.12))',
                border: '1px solid var(--accent, #1f6feb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                {step.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3, var(--text2))', letterSpacing: '0.06em' }}>
                    BƯỚC {step.num}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  {step.desc}
                </div>
                <div style={{
                  fontSize: 13, color: 'var(--text2)', lineHeight: 1.65,
                  borderTop: '1px solid var(--border)', paddingTop: 12,
                }}>
                  {step.detail}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manager section */}
      <div className="card" style={{ marginBottom: 32, padding: '16px 20px' }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <Wrench size={15} style={{ color: 'var(--text2)' }} />
          <span className="card-title">Trang Quản lý Repos</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0 }}>Sau khi tạo repo, bạn có thể quản lý chúng tại trang <strong style={{ color: 'var(--text)' }}>Quản lý</strong>:</p>
          {[
            ['Xem danh sách', 'Toàn bộ repo của bạn (hoặc org) hiển thị với trạng thái, visibility, ngày tạo'],
            ['Đổi tên hàng loạt', 'Chọn nhiều repo → đặt pattern tên mới → áp dụng'],
            ['Xoá hàng loạt', 'Tick chọn các repo cần xoá, xác nhận và xoá cùng lúc'],
            ['Cập nhật file', 'Upload file mới vào nhiều repo đã tồn tại cùng lúc'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <ChevronRight size={13} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
              <span><strong style={{ color: 'var(--text)' }}>{title}</strong>: {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
          Câu hỏi thường gặp
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => (
            <div key={i} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--green)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>{faq.q}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{faq.a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}