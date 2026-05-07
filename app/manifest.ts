import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Farm",
    short_name: "Farm",
    description: "Request engagement from your trusted Farm.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2f6f3e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Ask for engagement",
        short_name: "Ask",
        description: "Start a new engagement request.",
        url: "/",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "My Farms",
        short_name: "Farms",
        description: "View and manage your Farms.",
        url: "/farms",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Settings",
        short_name: "Settings",
        description: "Manage your Farm account.",
        url: "/settings",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
