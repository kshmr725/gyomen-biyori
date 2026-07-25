import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "魚麵日和｜小魚的台北拉麵地圖",
  description: "從地圖、步行時間、預算與排隊狀況，幫你決定今天吃哪碗。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
