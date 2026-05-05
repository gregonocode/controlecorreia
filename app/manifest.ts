import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cash Correia",
    short_name: "Cash Correia",
    description: "Painel financeiro da Cash Correia",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F7F5",
    theme_color: "#181818",
    icons: [
      {
        src: "/icon-129.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-192.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/maskable-icon-512.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
