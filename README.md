# GitHub Bulk Repo Creator

> Ứng dụng web giúp tạo, quản lý và cập nhật hàng loạt GitHub repository chỉ trong vài cú click — thay thế hoàn toàn quy trình thao tác tay lặp đi lặp lại trên GitHub.

**Live demo:** [github-bulk-creator.vercel.app](https://vanmy-github.vercel.app)

---

## Giới thiệu

Khi cần tạo nhiều repo cùng lúc theo một quy luật đặt tên nhất định (ví dụ: tạo repo nộp bài cho từng buổi học, từng học viên, từng dự án con...), việc tạo tay trên GitHub từng cái một rất tốn thời gian và dễ sai sót. Tương tự, khi cần đổi tên, đổi quyền riêng tư, hay cập nhật file cho hàng chục repo đã có sẵn, GitHub không cung cấp công cụ thao tác hàng loạt.

**GitHub Bulk Repo Creator** giải quyết toàn bộ vấn đề đó bằng một dashboard duy nhất, chạy hoàn toàn trên trình duyệt, kết nối trực tiếp tới GitHub REST API bằng Personal Access Token của người dùng.

---

## Tính năng chính

Ứng dụng được tổ chức thành 5 khu vực chức năng:

### 1. 🚀 Repo Creator — Tạo repo hàng loạt

| Tính năng | Mô tả |
|---|---|
| **3 chế độ đặt tên** | **Dãy số** (sinh tự động theo mẫu, ví dụ `ss3_bai1` → `ss3_bai10`), **Nhập tay** (thêm từng tên một), **Danh sách tự do** (dán nhiều tên cùng lúc, mỗi tên một dòng) |
| **Tạo dưới cá nhân hoặc tổ chức** | Tự động lấy danh sách Organization mà token có quyền truy cập, cho phép chọn nơi tạo repo |
| **Cấu hình chung cho mọi repo** | Visibility (Public/Private), tự động khởi tạo README, mô tả repo |
| **Upload file khi tạo** | Hai lớp file: **file chung** (đính kèm vào tất cả repo) và **file riêng theo từng repo** (chỉ đính kèm vào repo cụ thể), hỗ trợ kéo-thả cả thư mục và giữ nguyên cấu trúc folder |
| **Tuỳ chỉnh độ trễ (delay)** | Điều chỉnh khoảng nghỉ giữa các request để tránh chạm rate limit của GitHub |
| **Theo dõi tiến trình real-time** | Log trạng thái từng repo (đang chờ / đang chạy / thành công / lỗi) ngay khi thực thi |

### 2. 🛠️ Repo Manager — Quản lý repo đã có

| Hành động hàng loạt | Mô tả |
|---|---|
| **Thêm tiền tố / hậu tố** | Đổi tên nhiều repo cùng lúc bằng cách thêm chuỗi vào đầu hoặc cuối tên |
| **Tìm & thay thế tên** | Thay một đoạn ký tự trong tên bằng đoạn khác, áp dụng cho toàn bộ repo đã chọn |
| **Đổi visibility** | Chuyển Public ↔ Private cho nhiều repo một lượt |
| **Cập nhật mô tả** | Ghi đè description hàng loạt |
| **Chuyển owner (transfer)** | Chuyển repo sang tài khoản cá nhân khác hoặc một Organization khác |
| **Xoá hàng loạt** | Xoá nhiều repo cùng lúc, có bước xác nhận để tránh xoá nhầm |
| **Cập nhật file hàng loạt** | Upload, ghi đè (upsert), hoặc thay thế toàn bộ file trong nhiều repo đã chọn cùng lúc |
| **Lọc & tìm kiếm** | Tìm theo tên, lọc theo Public/Private, phân trang khi danh sách repo lớn |
| **Xem trước thay đổi** | Preview tên mới trước khi áp dụng đổi tên thật |

### 3. 📊 Dashboard

Tổng quan nhanh: thông tin tài khoản đang đăng nhập, số liệu tổng hợp từ lịch sử tạo repo, lối tắt điều hướng tới các khu vực chức năng khác.

### 4. 🕒 History — Lịch sử

Lưu lại chi tiết kết quả của mỗi lần tạo repo (tên repo, trạng thái thành công/lỗi, link tới repo) ngay trên trình duyệt (`localStorage`), giúp tra cứu lại các phiên làm việc trước đó mà không cần gọi lại API.

### 5. 📖 Guide — Hướng dẫn sử dụng

Trang hướng dẫn tích hợp sẵn trong app, hướng dẫn từng bước cách lấy token và sử dụng các tính năng.

---

## Xác thực & bảo mật

- Ứng dụng dùng **GitHub Personal Access Token (PAT)** do người dùng tự tạo và nhập vào — không có backend lưu trữ token.
- Token được kiểm tra hợp lệ ngay khi nhập (gọi `GET /user`) và đọc các scope hiện có để biết quyền thao tác Organization.
- Mọi request tạo/sửa/xoá repo và file đều gọi trực tiếp tới **GitHub REST API v3** từ trình duyệt của người dùng.

---

## Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Ngôn ngữ | TypeScript |
| UI / Styling | Tailwind CSS, [lucide-react](https://lucide.dev/) (icon) |
| Giao tiếp dữ liệu | GitHub REST API v3 (`fetch`, không dùng SDK) |
| Lưu trữ phía client | `localStorage` (lịch sử & token) |
| Hosting đề xuất | Vercel |

---

## Bắt đầu nhanh

### Chạy local

```bash
git clone https://github.com/tvmptit0511-ui/github-bulk-creator.git
cd github-bulk-creator
npm install
npm run dev
```

Mở trình duyệt tại **http://localhost:3000**

### Deploy lên Vercel (2 bước)

**Bước 1 — Push code lên GitHub**

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/github-bulk-creator.git
git push -u origin main
```

**Bước 2 — Deploy**

1. Vào [vercel.com](https://vercel.com) → **New Project**
2. Import repo vừa push
3. Nhấn **Deploy** — Vercel tự nhận diện Next.js, không cần cấu hình thêm

---

## Lấy GitHub Personal Access Token

1. Vào **GitHub → Settings → Developer settings → Personal access tokens**
2. Chọn **Generate new token (classic)**
3. Tích quyền **`repo`** (bắt buộc để tạo, đọc, ghi và xoá repo/file). Nếu cần thao tác trên Organization, tích thêm **`read:org`**
4. Copy token và dán vào ô xác thực trong app

> ⚠️ Token chỉ hiển thị một lần ngay sau khi tạo — hãy copy lại trước khi đóng trang. Không chia sẻ token với người khác hoặc commit vào source code.

---

## Cấu trúc thư mục

```
github-bulk-creator/
├── app/
│   ├── components/        # Toàn bộ UI: AuthCard, RepoNameBuilder,
│   │                       # PerRepoFileManager, RepoManager, RepoFileUpdater,
│   │                       # DashboardPage, HistoryPanel, GuidePage, Sidebar, Topbar, LogPanel
│   ├── lib/
│   │   ├── github.ts       # Toàn bộ hàm gọi GitHub REST API (tạo/sửa/xoá repo, quản lý file...)
│   │   └── storage.ts       # Lưu/đọc lịch sử từ localStorage
│   ├── types/              # Định nghĩa kiểu dữ liệu chung (RepoFile, HistoryEntry, LogItem...)
│   ├── page.tsx             # Trang chính — điều phối toàn bộ navigation & state
│   └── layout.tsx
├── public/                  # Static assets
├── next.config.ts
└── package.json
```

---

## Giới hạn cần lưu ý

- Tạo tối đa **500 repo** trong một lần (theo dãy số) để tránh quá tải; trên 100 repo sẽ có cảnh báo xác nhận trước khi chạy.
- Tốc độ tạo/cập nhật phụ thuộc vào **rate limit của GitHub API** — nên điều chỉnh delay phù hợp khi xử lý số lượng lớn.
- Hành động **xoá repo** và **chuyển owner** không thể hoàn tác — app luôn yêu cầu xác nhận trước khi thực thi.

---

## License

MIT
