# SBT Certificate System - Deployment Guide

本指南將帶您完成 Soulbound Token (SBT) 憑證系統的完整部署流程。

## 目錄

1. [前置需求](#前置需求)
2. [本地開發環境設定](#本地開發環境設定)
3. [部署智能合約](#部署智能合約)
4. [配置前端](#配置前端)
5. [部署應用程式](#部署應用程式)
6. [驗證與測試](#驗證與測試)
7. [常見問題](#常見問題)

---

## 前置需求

### 必備工具
- Node.js >= 20.0.0
- npm 或 pnpm
- Git
- 至少一個 EVM 錢包（如 MetaMask）

### 必備帳號
- [NFT.Storage](https://nft.storage) 帳號（免費 IPFS 儲存）
- [WalletConnect](https://cloud.walletconnect.com) Project ID（可選，但建議）
- [PolygonScan](https://polygonscan.com/apis) API Key（用於驗證合約）

### 測試網代幣
如果要在測試網部署，需要獲取測試代幣：
- **Polygon Amoy**: https://faucet.polygon.technology/
- **Sepolia**: https://sepoliafaucet.com/
- **BSC Testnet**: https://testnet.bnbchain.org/faucet-smart

---

## 本地開發環境設定

### 1. Clone 專案

```bash
git clone <repo-url>
cd Dastacenter_Builder_Sinulator
```

### 2. 安裝依賴

```bash
npm install --legacy-peer-deps
cd contracts
npm install
cd ..
```

### 3. 設定環境變數

複製 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入以下必要資訊：

```bash
# 必填：Session secret（用 openssl 生成）
SESSION_SECRET=$(openssl rand -base64 32)

# 必填：SBT 鑄造錢包私鑰（必須是合約 owner）
SBT_MINTER_PRIVATE_KEY=0x...

# 建議：應用程式網址（本機測試可用 localhost）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 必填：NFT.Storage API Key（到 https://nft.storage 註冊免費帳號）
NEXT_PUBLIC_NFT_STORAGE_KEY=eyJ...

# 建議填寫：WalletConnect Project ID
NEXT_PUBLIC_WC_PROJECT_ID=your-project-id
```

### 4. 啟動開發服務器

```bash
npm run dev
```

訪問 http://localhost:3000 確認應用程式正常運行。

---

## 部署智能合約

### 選擇部署網路

建議順序：
1. **Polygon Amoy Testnet**（測試）
2. **Polygon Mainnet**（正式環境，成本最低）
3. 其他網路（根據需求）

### 準備部署

1. 創建部署錢包並儲存私鑰：

```bash
# 在 .env.local 中添加
PRIVATE_KEY=your_deployer_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

⚠️ **警告**：永遠不要將包含真實資金的錢包私鑰放入 .env 檔案！為部署創建專用錢包。

2. 確保錢包有足夠的測試代幣或主網代幣

### 部署到 Polygon Amoy（測試網）

```bash
cd contracts
npm run deploy:amoy
```

成功後，你會看到：

```
✅ DatacenterCertificateSBT deployed to: 0x1234...
Add this to your .env.local:
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY=0x1234...
```

### 部署到其他網路

```bash
# Polygon Mainnet
npm run deploy:polygon

# Ethereum Sepolia Testnet
npm run deploy:sepolia

# BSC Testnet
npm run deploy:bsc-testnet
```

### 更新合約地址

將部署的合約地址填入 `.env.local`，例如：

```bash
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY=0xYourDeployedContractAddress
```

如果你之後部署其他鏈，也可以擴充成：

```bash
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON=0x...
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_SEPOLIA=0x...
```

---

## 配置前端

### 1. 驗證 wagmi 配置

確認 `src/lib/wallet/wagmi.ts` 包含所有你部署合約的鏈。

### 2. 測試憑證鑄造流程

1. 在本地啟動應用：`npm run dev`
2. 連接錢包（切換到測試網）
3. 完成一個 datacenter build
4. 前往憑證頁面
5. 選擇測試網（如 Polygon Amoy）
6. 點擊「Mint Certificate」
7. 確認交易
8. 交易成功後，頁面會顯示 tx hash、鏈上 explorer 連結與 token ID

如果成功，你會看到 Token ID 和區塊鏈瀏覽器連結。

---

## 部署應用程式

### 選項 A：部署到 Cloudflare Workers

```bash
# 確保你已登入 Cloudflare
npm run deploy
```

這會：
1. 使用 OpenNext 構建應用
2. 部署到 Cloudflare Workers
3. 自動配置 assets 服務

### 選項 B：部署到 Vercel

```bash
vercel --prod
```

確保在 Vercel 儀表板中設定環境變數。

### 選項 C：部署到 Netlify

```bash
npm run build
npx netlify deploy --prod
```

---

## 驗證與測試

### 測試清單

- [ ] 應用程式在生產環境正常載入
- [ ] 錢包連接正常（MetaMask、WalletConnect 等）
- [ ] 可以切換到所有支援的網路
- [ ] 可以完成 datacenter build
- [ ] 憑證頁面正常顯示 SVG
- [ ] 可以下載憑證（SVG/PNG）
- [ ] **測試網**：可以成功鑄造 SBT
  - [ ] 測試網代幣提醒正常顯示
  - [ ] Gas 費用估算正確
  - [ ] 交易成功確認
  - [ ] 可以在區塊鏈瀏覽器查看
  - [ ] Metadata 可以從 IPFS 訪問
- [ ] **主網**（小額測試）：可以成功鑄造 SBT
  - [ ] 確認真實 gas 費用
  - [ ] 驗證 metadata 儲存
- [ ] 已鑄造的憑證會顯示警告（防止重複鑄造）

### 驗證合約

在區塊鏈瀏覽器上驗證合約可讀性：

```bash
cd contracts
npx hardhat verify --network polygon-amoy <CONTRACT_ADDRESS> \
  "Datacenter Builder Certificate" "DBC" ""
```

---

## 成本估算（2026）

### 合約部署成本

| 網路 | Gas 費用 | 估算成本 (USD) |
|------|---------|---------------|
| Polygon Amoy | ~1-2 MATIC | $0.00（測試網） |
| Polygon Mainnet | ~0.1 MATIC | ~$0.05 |
| Ethereum Sepolia | ~0.01 ETH | $0.00（測試網） |
| Ethereum Mainnet | ~0.005 ETH | ~$10 |
| BSC Mainnet | ~0.01 BNB | ~$3 |

### 每次鑄造成本

| 網路 | Gas 費用 | Metadata 儲存 | 總成本 |
|------|---------|--------------|--------|
| Polygon Amoy | ~$0.00 | Free (IPFS) | **$0.00** |
| Polygon Mainnet | ~$0.01 | $0.001 | **~$0.011** ⭐ |
| Ethereum Mainnet | ~$0.50-5 | $0.001-5 | **~$0.50-10** |
| BSC Mainnet | ~$0.05 | $0.001 | **~$0.051** |

⭐ **建議**：Polygon Mainnet 是成本效益最佳選擇

---

## 常見問題

### Q: 如何獲取 NFT.Storage API Key？

1. 訪問 https://nft.storage
2. 註冊免費帳號
3. 在 API Keys 頁面創建新 key
4. 複製 key 到 `.env.local`

### Q: 測試網交易失敗怎麼辦？

1. 確認錢包有足夠的測試代幣
2. 檢查 `.env.local` 的 `NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY` 是否已填入部署後的地址
3. 確認 RPC URL 可以訪問
4. 查看瀏覽器控制台的錯誤訊息

### Q: Metadata 上傳失敗？

1. 檢查 `NEXT_PUBLIC_NFT_STORAGE_KEY` 是否正確
2. 確認 API key 有效且未過期
3. 嘗試切換到 Pinata（需要另外配置）

### Q: 如何支援更多鏈？

1. 在 `src/lib/sbt/chains.ts` 添加新鏈配置
2. 在 `src/lib/wallet/wagmi.ts` 添加 wagmi chain 定義
3. 在 `hardhat.config.js` 添加部署配置
4. 部署合約到新鏈
5. 設定對應的 `NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_<NETWORK>` 環境變數

### Q: 用戶需要支付 gas 費嗎？

是的，用戶需要自己支付 gas 費。這是去中心化的特點。
建議：
- 在測試網讓用戶免費測試
- 在介面清楚顯示 gas 費用估算
- 提供測試網 faucet 連結

### Q: 如何降低鑄造成本？

1. 使用 Polygon 或 BSC（低 gas）
2. 選擇 IPFS 而非 on-chain metadata
3. 壓縮 SVG 大小
4. 考慮使用 meta-transaction（gasless）

---

## 下一步

- [ ] 設定監控（Sentry、PostHog）
- [ ] 配置 CDN 加速 IPFS
- [ ] 實作憑證查詢功能
- [ ] 添加排行榜整合
- [ ] 考慮 gasless transaction（如 Biconomy）

---

## 支援

如有問題：
1. 查看 `src/lib/sbt/README.md`
2. 檢查 GitHub Issues
3. 閱讀智能合約註釋
4. 查看區塊鏈瀏覽器的交易詳情
