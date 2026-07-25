import { AdminPanel } from "@/components/admin-panel";

export default function AdminPage() {
  return <main className="page-shell"><div className="page-heading"><p className="eyebrow">EDITOR DESK</p><h1>店家資料後台</h1><p>維護推薦需要的價格、排隊、評分與人工覆寫。</p></div><AdminPanel /></main>;
}
