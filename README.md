# Anypress

> Publish nội dung từ **Anytype** lên website cá nhân — tự động, nhanh gọn, local-first.

Anypress là công cụ self-hosted giúp bạn quản lý quy trình xuất bản nội dung từ Anytype (hoặc Markdown) lên website tĩnh qua GitHub Pages. Bao gồm dashboard quản lý trực quan, tích hợp CI/CD, và hỗ trợ selective publishing.

## Tính năng

- 🔄 **Sync từ Anytype** — Kết nối Local API, tự động lấy bài viết có tag `publish`
- 📝 **Quản lý nội dung** — Xem danh sách, trạng thái Git, preview nội dung
- ☑️ **Selective Publishing** — Chọn bài muốn publish, không push tất cả
- 🚀 **One-click Deploy** — Commit + push → GitHub Actions tự build + deploy
- ⚙️ **CI/CD Dashboard** — Theo dõi trạng thái build trực tiếp
- 🧹 **Markdown Cleaner** — Tự động chuẩn hoá markdown từ Anytype cho Quartz

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Static Site | [Quartz 4](https://quartz.jzhao.xyz/) |
| Dashboard Backend | Node.js + Express |
| Dashboard Frontend | HTML/CSS/JS (vanilla) |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |
| Content Source | Anytype Local API |

## Cấu trúc Project

```
anypress/
├── content/              # Bài viết Markdown (Quartz content)
│   ├── index.md
│   └── toi-tu-hoc.md
├── dashboard/            # Dashboard tool
│   ├── server.js         # Express server
│   ├── services/         # Business logic
│   │   ├── anytype-client.js   # Anytype API + Markdown cleaner
│   │   ├── git-manager.js      # Git operations
│   │   ├── github-client.js    # GitHub API (CI/CD status)
│   │   └── quartz-builder.js   # Quartz preview server
│   ├── routes/           # API endpoints
│   │   ├── api-sync.js         # POST /api/sync
│   │   ├── api-content.js      # GET /api/content
│   │   ├── api-deploy.js       # POST /api/deploy
│   │   ├── api-preview.js      # POST /api/preview
│   │   └── api-ci.js           # GET /api/ci
│   └── public/           # Frontend UI
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js
├── quartz/               # Quartz engine (SSG)
│   └── styles/custom.scss  # Custom CSS
├── .github/workflows/
│   ├── deploy.yml        # Build & deploy on push
│   └── scheduled-build.yml  # Daily scheduled rebuild
├── .env                  # Cấu hình (not committed)
├── .env.example          # Template cấu hình
└── quartz.config.ts      # Quartz configuration
```

## Cài đặt

### Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- [Git](https://git-scm.com/)
- [Anytype Desktop](https://anytype.io/) (đã bật Local API)

### Bước 1: Clone project

```bash
git clone https://github.com/AnhMinh245/anypress.git
cd anypress
npm install
```

### Bước 2: Cài dependencies cho Dashboard

```bash
cd dashboard
npm install
cd ..
```

### Bước 3: Cấu hình

Copy file `.env.example` → `.env` và điền thông tin:

```bash
cp .env.example .env
```

```env
# Anytype Local API
ANYTYPE_API_URL=http://127.0.0.1:31009
ANYTYPE_API_KEY=your_api_key_here
ANYTYPE_SPACE_ID=your_space_id_here

# GitHub
GITHUB_REPO=your-username/anypress
GITHUB_TOKEN=your_github_token_here

# Dashboard
DASHBOARD_PORT=3000
```

#### Lấy Anytype API Key

1. Mở **Anytype Desktop**
2. Vào **Settings** → **API** → bật **Local API**
3. Copy **API Key**

#### Lấy Space ID

Gọi API để liệt kê spaces:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Anytype-Version: 2025-11-08" \
     http://127.0.0.1:31009/v1/spaces
```

Copy `id` của space bạn muốn dùng.

#### Lấy GitHub Token

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Tạo token với quyền `repo`

### Bước 4: Cấu hình GitHub Pages

1. Vào repo trên GitHub → **Settings** → **Pages**
2. **Source**: chọn **GitHub Actions**

## Sử dụng

### Khởi động Dashboard

```bash
cd dashboard
npm start

# Hoặc dev mode (auto-reload):
npm run dev
```

Mở **http://localhost:3000** trên trình duyệt.

### Quy trình Publish

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. Anytype  │ ──→ │  2. Sync    │ ──→ │  3. Select  │ ──→ │  4. Publish │
│  Gắn tag     │     │  Dashboard  │     │  Chọn bài   │     │  Push + CI  │
│  "publish"   │     │  Sync Now   │     │  muốn đăng  │     │  Auto build │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Trong Anytype**: Mở bài viết → thêm tag **`publish`**
2. **Dashboard**: Nhấn **🔄 Sync Now** → bài xuất hiện trong danh sách
3. **Chọn bài**: ☑️ Tick vào bài muốn publish
4. **Publish**: Nhấn **🚀 Publish Selected** → tự commit, push, build, deploy

Website live tại: `https://<username>.github.io/anypress/`

## API Reference

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/sync` | `POST` | Sync content từ Anytype (body: `{ tag: "publish" }`) |
| `/api/sync/status` | `GET` | Kiểm tra kết nối Anytype |
| `/api/content` | `GET` | Danh sách file content + Git status |
| `/api/content/:filename` | `GET` | Nội dung 1 file |
| `/api/content/new` | `POST` | Tạo bài mới (body: `{ title: "..." }`) |
| `/api/deploy` | `POST` | Commit + push selected files |
| `/api/deploy/history` | `GET` | Lịch sử commit |
| `/api/preview` | `POST` | Khởi động Quartz preview server |
| `/api/preview` | `GET` | Trạng thái preview server |
| `/api/preview` | `DELETE` | Dừng preview server |
| `/api/ci` | `GET` | Trạng thái GitHub Actions |
| `/api/settings` | `GET` | Cấu hình hiện tại (masked) |

## Markdown Cleaner

Anytype export markdown với format riêng (4-space indent, trailing whitespace, v.v.) không tương thích với Quartz. Dashboard **tự động clean** khi sync:

| Vấn đề | Xử lý |
|--------|-------|
| 4+ space indentation → code blocks | Strip toàn bộ indent thừa |
| 8-space nested lists | Chuyển về 4-space (1 level) |
| Table cells có hàng trăm spaces padding | Trim mỗi cell |
| Thiếu blank lines trước/sau headings | Tự thêm blank lines |
| `---` sau frontmatter gây xung đột | Skip `---` đầu tiên |
| Trailing whitespace trên mỗi dòng | Trim trailing spaces |

## CI/CD

### Auto Deploy (`deploy.yml`)

Mỗi khi push lên `main`:
1. Checkout code
2. Install Node.js + dependencies
3. Build Quartz (`npx quartz build`)
4. Deploy lên GitHub Pages

### Scheduled Rebuild (`scheduled-build.yml`)

Tự động rebuild hàng ngày (UTC 00:00) để cập nhật metadata (ngày tháng, v.v.).

## Tuỳ chỉnh

### Thay đổi giao diện website

Sửa `quartz.config.ts` — xem [Quartz docs](https://quartz.jzhao.xyz/configuration).

### Custom CSS

Thêm CSS vào `quartz/styles/custom.scss`.

### Thay đổi tag filter

Mặc định sync bài có tag `publish`. Để đổi, sửa trong Dashboard frontend (`dashboard/public/js/app.js`):

```javascript
body: JSON.stringify({ tag: 'your-custom-tag' })
```

## Bảo mật

- ⚠️ **Không commit `.env`** — file đã có trong `.gitignore`
- 🔑 GitHub Token chỉ cần quyền `repo`
- 🏠 Dashboard chạy localhost — không expose ra internet
- API key Anytype chỉ hoạt động local

## License

MIT
