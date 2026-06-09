import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hospira",
    short_name: "Hospira",
    description: "Software modern pentru pensiuni și hoteluri mici",
    lang: "ro",
    dir: "ltr",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0f0e14",
    theme_color: "#0f0e14",
    orientation: "any",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/brand/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
