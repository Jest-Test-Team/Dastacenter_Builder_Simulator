# Cloudflare Pages 部署指南

本專案可部署至 **Cloudflare Pages** 使用 `@opennextjs/cloudflare` 適配器。

## 部署至 Cloudflare Pages

### 方法 1：使用 Cloudflare Dashboard（推薦）

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 進入 **Workers & Pages**
3. 點擊 **Create application** → **Pages** → **Connect to Git**
4. 選擇此 repository
5. 配置建置設定：
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Environment variables**: 設定必要的環境變數（見下方）

### 方法 2：使用 Wrangler CLI

```bash
# 建置並部署
npm run deploy

# 本地預覽
npm run preview
```

## 必要環境變數

在 Cloudflare Dashboard 設定以下環境變數：

```bash
# Session secret (32+ 字元隨機字串)
SESSION_SECRET=your_production_secret_here_at_least_32_characters

# (可選) WalletConnect Project ID
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id

# (可選) Credly API
CREDLY_API_TOKEN=
CREDLY_ORG_ID=
CREDLY_TEMPLATE_BRONZE=
CREDLY_TEMPLATE_SILVER=
CREDLY_TEMPLATE_GOLD=
CREDLY_TEMPLATE_PLATINUM=
CREDLY_TEST_MODE=true
```

## 已知限制

由於 Cloudflare Workers 的限制，以下功能可能需要調整：

1. **檔案系統操作** — Workers 沒有檔案系統，所有資料需使用 KV/D1/R2
2. **ServerActions** — 部分 Next.js Server Actions 可能需要改寫為 API routes
3. **Node.js API** — 只支援部分 Node.js API（透過 `nodejs_compat` flag）

## Vercel 部署（替代方案）

如果遇到相容性問題，專案也可以部署到 Vercel：

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

Vercel 配置檔已包含在 `vercel.json`。

## 疑難排解

### Build 失敗：Cannot find module 'wrangler'

確認已安裝依賴：
```bash
npm install
```

### Runtime 錯誤：Session secret not set

在 Cloudflare Dashboard 設定 `SESSION_SECRET` 環境變數。

### WalletConnect 連線失敗

設定 `NEXT_PUBLIC_WC_PROJECT_ID` 或使用 MetaMask/Coinbase Wallet（不需要 Project ID）。
