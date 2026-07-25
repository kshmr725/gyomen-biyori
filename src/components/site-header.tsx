"use client";

import Link from "next/link";
import { AuthButton } from "@/components/auth-button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-lockup"><span className="brand-jp">魚麵日和</span><span>GYOMEN BIYORI</span></Link>
      <nav><Link href="/choose">幫我選</Link><Link href="/explore">逛地圖</Link><Link href="/profile">我的紀錄</Link><AuthButton /></nav>
    </header>
  );
}
