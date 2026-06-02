import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gift card images use unoptimized={true} so the Image Optimizer
  // never proxies external URLs — no domain allowlist needed.
  // Admin thumbnails already use unoptimized={true} too.
};

export default nextConfig;
