import { ExploreView } from "@/components/explore-view";

export default function ExplorePage() {
  return (
    <main className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">BROWSE THE CITY</p>
        <h1>自由逛逛</h1>
        <p>地圖和清單一起看，先不用做決定。</p>
      </div>
      <ExploreView />
    </main>
  );
}
