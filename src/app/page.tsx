import Link from "next/link";
import { FishMark } from "@/components/fish-mark";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">TAIPEI RAMEN JOURNAL</p>
          <h1>魚麵日和</h1>
          <p className="subtitle">小魚的台北拉麵地圖</p>
          <p className="lede">
            地點選好了，剩下的交給我們。用步行時間、預算和排隊耐心，替今天選出一碗剛剛好的拉麵。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/choose">幫我選一間</Link>
            <Link className="button button-ghost" href="/explore">自由逛逛</Link>
          </div>
          <p className="microcopy">不做排行榜，也不讓你無限重抽。今天就吃這間。</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun-disc" />
          <div className="ramen-bowl">
            <span className="noodle noodle-one" />
            <span className="noodle noodle-two" />
            <span className="egg" />
            <span className="nori" />
          </div>
          <FishMark />
        </div>
      </section>
      <section className="editorial-strip">
        <article><span>01</span><h2>點一個位置</h2><p>從現在所在地或台北任何一個角落開始。</p></article>
        <article><span>02</span><h2>回答三件事</h2><p>走多久、花多少、願不願意排隊。</p></article>
        <article><span>03</span><h2>只給一個答案</h2><p>從最符合的前三間中替你做決定。</p></article>
      </section>
    </main>
  );
}
