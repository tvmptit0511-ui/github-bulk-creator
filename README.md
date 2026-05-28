# GitHub Bulk Repo Creator

Công cụ web để tạo nhiều GitHub repo cùng lúc, hỗ trợ upload file vào tất cả repo.

## Tính năng

- **3 chế độ tạo tên**: Dãy số (`ss3_bai1`→`ss3_bai10`), Nhập tay, Danh sách tự do
- **Upload file**: Đính kèm file vào tất cả repo được tạo
- **Lịch sử**: Lưu kết quả mỗi lần tạo vào localStorage
- **Xác thực token**: Kiểm tra token ngay khi nhập, lưu lại cho lần sau

## Deploy lên Vercel (2 bước)

### Bước 1 — Push lên GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/github-bulk-creator.git
git push -u origin main
```

### Bước 2 — Deploy Vercel
1. Vào https://vercel.com → **New Project**
2. Import repo vừa tạo
3. Nhấn **Deploy** — xong!

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Lấy GitHub Token

1. GitHub → Settings → Developer settings → Personal access tokens
2. **Generate new token (classic)**
3. Tích quyền **`repo`**
4. Copy token và dán vào app
