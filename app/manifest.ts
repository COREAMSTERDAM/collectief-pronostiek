import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Collectief Wit en Zwet",
    short_name: "Wit en Zwet",
    description:
      "De community-app voor supporters van Collectief Wit en Zwet.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#16a34a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
