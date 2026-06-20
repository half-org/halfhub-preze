import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow opening the dev server via the LAN IP (Next blocks
  // cross-origin dev resources by default since 15.2). Production unaffected.
  allowedDevOrigins: ["127.0.0.1", "192.168.0.172"],
};

export default nextConfig;
