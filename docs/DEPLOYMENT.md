# Deployment and external-account checklist

## 已自動完成

- Vercel 部署檔案格式已修正為 `{ file, data }`。
- Production build script 會執行 lint、typecheck、unit test 和 Next build。
- 路線預設改為無 key 的 Valhalla pedestrian matrix。
- 真實台北店家資料已替換原虛構 seed。
- 專案可在缺少 Supabase 時安全啟動；只有帳號相關功能停用。

## 必須由帳號擁有者授權

下列工作無法由程式碼或無授權連線代替：

1. 建立 Supabase project。
2. 建立 Google Cloud OAuth Client，接受 Google 條款並取得 client ID / secret。
3. 將 Supabase 與 OAuth 環境變數寫入 Vercel。
4. 在 GitHub 網站建立 Private repository（目前 GitHub Connector 只支援既有 repository 的內容操作，沒有 create repository action）。

完成後執行：

```bash
git remote add origin git@github.com:kshmr725/gyomen-biyori.git
git push -u origin main
```
