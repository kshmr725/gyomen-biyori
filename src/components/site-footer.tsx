import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="brand-lockup">
            <span className="brand-jp">魚麵日和</span>
            <span className="brand-en">GYOMEN BIYORI</span>
          </div>
          <p className="footer-subtext">小魚的台北拉麵地圖 · 專屬美食指南</p>
        </div>

        <nav className="footer-links">
          <Link href="/choose">幫我選拉麵</Link>
          <Link href="/explore">自由逛地圖</Link>
          <Link href="/profile">我的紀錄與足跡</Link>
        </nav>

        <div className="footer-copyright">
          <p>© 2026 魚麵日和 GYOMEN BIYORI. All Rights Reserved.</p>
          <p className="ownership-text">本網站作品與相關專利權、著作權及所有權歸屬 小魚 與 魚麵日和 團隊所有。</p>
        </div>
      </div>
    </footer>
  );
}
