import type { NextConfig } from "next";

const securityHeaders = [
  // Block this site from being framed by other sites (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit how much referrer info leaks when users click outbound links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down browser features we don't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Belt-and-braces clickjacking protection (modern equivalent of X-Frame-Options).
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  // Don't advertise that we're running Next.js in the response headers.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
