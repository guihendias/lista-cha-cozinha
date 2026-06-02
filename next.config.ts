import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Unsplash (placeholder images used during development)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Amazon product images
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      // Common Brazilian e-commerce CDNs
      { protocol: "https", hostname: "**.americanas.com.br" },
      { protocol: "https", hostname: "**.magazineluiza.com.br" },
      { protocol: "https", hostname: "**.casasbahia.com.br" },
      { protocol: "https", hostname: "**.shoptime.com.br" },
      { protocol: "https", hostname: "**.extra.com.br" },
      { protocol: "https", hostname: "**.pontofrio.com.br" },
      { protocol: "https", hostname: "**.submarino.com.br" },
    ],
  },
};

export default nextConfig;
