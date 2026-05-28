# GitHub Bulk Repo Creator

> Tạo hàng loạt GitHub repository chỉ trong vài giây — có hỗ trợ upload file vào tất cả repo cùng lúc.

**Live demo:** [github-bulk-creator.vercel.app](https://github-bulk-creator.vercel.app)

---

## Tại sao cần tool này?

Khi bạn cần tạo 10–20 repo cùng một cấu trúc tên (ví dụ: nộp bài tập theo buổi học), làm tay trên GitHub mất rất nhiều thao tác lặp đi lặp lại. Tool này giải quyết đúng vấn đề đó.

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| **3 chế độ đặt tên** | Dãy số tự động (`ss3_bai1` → `ss3_bai10`), nhập tay từng cái, hoặc dán danh sách tự do |
| **Upload file hàng loạt** | Đính kèm file vào tất cả repo được tạo trong một lần chạy |
| **Lịch sử tạo repo** | Kết quả mỗi lần tạo được lưu lại vào localStorage để tra cứu sau |
| **Xác thực token tức thì** | Kiểm tra GitHub token ngay khi nhập, tự lưu lại cho lần sau |

---

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- GitHub REST API v3

---

## Chạy local

```bash
git clone https://github.com/tvmptit0511-ui/github-bulk-creator.git
cd github-bulk-creator
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

---

## Deploy lên Vercel

```bash
# 1. Push code lên GitHub
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/github-bulk-creator.git
git push -u origin main
```

```
# 2. Vào vercel.com → New Project → Import repo → Deploy
```

Không cần cấu hình gì thêm — Vercel tự nhận Next.js.

---

## Lấy GitHub Personal Access Token

1. Vào **GitHub → Settings → Developer settings → Personal access tokens**
2. Chọn **Generate new token (classic)**
3. Tích quyền **`repo`** (bắt buộc để tạo và ghi vào repo)
4. Copy token → dán vào ô token trong app

> ⚠️ Token chỉ hiện một lần sau khi tạo — copy ngay trước khi đóng trang.

---

## Cấu trúc thư mục

```
github-bulk-creator/
├── app/          # Next.js App Router — pages & components
├── public/       # Static assets
├── next.config.ts
└── package.json
```

---

## License

MIT
