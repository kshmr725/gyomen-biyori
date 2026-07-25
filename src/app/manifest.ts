import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "魚麵日和｜小魚的台北拉麵地圖",
    short_name: "魚麵日和",
    description: "地點選好了，剩下的交給我們。小魚的台北拉麵地圖 App。",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF7",
    theme_color: "#9B2C2C",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
