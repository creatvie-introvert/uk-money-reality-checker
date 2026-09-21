import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow loopback automation and this Mac's LAN origin for phone testing.
  // A blocked development connection leaves the server-rendered form unhydrated.
  allowedDevOrigins: ["127.0.0.1", "192.168.1.20"],
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
      // Safe directives now; script/style nonce or hash policy needs deployment review.
      { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
    ] }];
  },
};

export default nextConfig;
