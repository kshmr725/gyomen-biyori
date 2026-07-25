# 魚麵日和（Gyomen Biyori）

小魚的台北拉麵地圖。以地圖選點、步行時間、預算、排隊容忍度與個人紀錄，從符合條件的前三間店中替使用者選出一間。

## 已實作

- 手機優先的日系雜誌風首頁
- 「幫我選一間」逐步推薦流程
- Leaflet + OpenStreetMap 地圖選點
- 5／10／15／20 分鐘步行範圍
- 預算、排隊、想吃新店／可重複篩選
- 只推薦營業中的店
- Top 3 隨機選一間，僅能換一次
- 自由瀏覽地圖＋清單
- 店家詳情頁與 Google Maps 外部導航
- Supabase Google 登入入口
- 收藏／吃過／評分／再訪資料庫 schema
- 管理員資料模型與 OSM 同步佇列 schema
- openrouteservice Matrix API 路線時間端點
- 路線服務失效時「可信快取優先，否則停止推薦」的 fail-closed 行為

## 本機啟動

```bash
cp .env.example .env.local
npm install
npm run dev
```

在本機預覽時可保留 `NEXT_PUBLIC_DEMO_MODE=true`。此模式會清楚標示步行時間為估算，不得用於正式上線。

## 正式上線前必做

1. 建立 Supabase Free 專案，執行 `supabase/migrations/001_initial.sql`。
2. 在 Supabase Auth 啟用 Google Provider，設定正式及本機 redirect URL。
3. 建立 openrouteservice API key，填入 `ORS_API_KEY`。
4. 將 `NEXT_PUBLIC_DEMO_MODE` 設為 `false` 或移除。
5. 將自己的 profile role 更新為 `admin`。
6. 審核並匯入正式台北拉麵店資料；目前 seed 僅為介面示範。
7. 在 Vercel 設定環境變數後部署。

## 核心 Guardrails

- 沒有可信步行路線資料時，不得用直線距離冒充實際步行時間。
- 營業狀態不明的店不得進入推薦。
- 人工覆寫資料優先於 OSM 同步資料。
- 推薦候選只包含資料完整且 `recommendation_ready=true` 的店。
- 個人評分第一版為私人資料。
