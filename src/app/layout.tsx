import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./performance.css";
import "./location-flow.css";
import "./cis.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/lib/i18n";
import { PWAInstaller } from "@/components/pwa-installer";

export const viewport: Viewport = {
  themeColor: "#F6EDE2",
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
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/favicon.svg",
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
