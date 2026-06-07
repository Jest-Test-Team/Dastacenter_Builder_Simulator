# Cloudflare Pages 部署指南

本專案使用 `@opennextjs/cloudflare` 適配器，將 Next.js 15 專案部署至 Cloudflare。

## 部署方式

### 方法 1：使用 Cloudflare Pages Git 整合 (推薦)

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 進入 **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**
3. 選擇此 repository。
4. **Build settings** 設定如下：
   - **Framework preset**: `None`
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `.open-next`
5. **Environment variables** 設定：
   - `NODE_VERSION`: `22` (或更高)
   - `SESSION_SECRET`: (產線用的 32+ 字元密鑰)
6. **Compatibility flags** (在 Settings -> Functions):
   - 務必新增 `nodejs_compat` 於 Production 與 Preview。

### 方法 2：使用 Wrangler CLI 手動部署

我們已配置好 `wrangler.jsonc`，支援最新的 **Workers with Assets** 模型。

```bash
# 建置並部署
npm run deploy

# 本地預覽
npm run preview
```

## 必要環境變數

請在 Cloudflare Dashboard 的 Variables 頁面設定：

```bash
SESSION_SECRET=your_production_secret_here_at_least_32_characters
```

## 已知限制與修正

1. **Edge Runtime**: OpenNext 在 Next.js 15 下不建議在 API Routes 顯式使用 `export const runtime = 'edge'`，本專案已移除相關宣告以確保建置成功。
2. **Node.js 相容性**: 必須開啟 `nodejs_compat` flag。
3. **Wrangler 配置**: 專案已使用 `wrangler.jsonc` 取代舊有的 Pages 配置，以支援最新的 Cloudflare 部署架構。

## 疑難排解

若建置失敗並出現 `Missing entry-point`：
- 確認 `wrangler.jsonc` 中的 `main` 指向 `.open-next/worker.js`。
- 確認 `Build command` 是 `npm run build:cloudflare` 而不是預設的 `npm run build`。
