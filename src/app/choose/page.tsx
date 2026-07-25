import { RecommendationWizard } from "@/components/recommendation-wizard";

export default function ChoosePage() {
  return (
    <main className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">CHOOSE ONE BOWL</p>
        <h1>今天吃哪碗？</h1>
        <p>先在地圖上點一個位置，再回答幾個不麻煩的問題。</p>
      </div>
      <RecommendationWizard />
    </main>
  );
}
