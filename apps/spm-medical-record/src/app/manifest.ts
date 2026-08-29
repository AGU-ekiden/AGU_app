import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/api-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SPM カルテシステム",
    short_name: "SPMカルテ",
    description: "パーソナルトレーニング記録管理システム",
    lang: "ja",
    // basePath配下(ゲートウェイ経由で /spm-medical-record)に配信されるため、
    // start_url/scope/iconsはNext.jsが自動でプレフィックスしてくれないここだけ
    // 手動でBASE_PATHを付与する
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#3e8a88",
    icons: [
      {
        src: `${BASE_PATH}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Androidのアダプティブアイコン用(円/squircleなど端末ごとの形に切り抜かれる)。
        // 切り抜かれても欠けないよう、中央80%のセーフゾーン内にマークを収めている。
        src: `${BASE_PATH}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
