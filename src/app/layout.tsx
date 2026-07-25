import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/lib/i18n";
import { PWAInstaller } from "@/components/pwa-installer";

export const viewport: Viewport = {
  themeColor: "#9B2C2C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "魚麵日和｜小魚的台北拉麵地圖",
  description: "從地圖、步行時間、預算與排隊狀況，幫你決定今天吃哪碗。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "魚麵日和",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <LanguageProvider>
          <SiteHeader />
          {children}
          <PWAInstaller />
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
