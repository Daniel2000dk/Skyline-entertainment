import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Static CSP (no nonces) so public pages stay statically cacheable, which
// keeps hosting free. 'unsafe-inline' for scripts is required by Next.js
// without nonces; XSS defence relies on React escaping (no raw HTML) and on
// blocking every other source. The browser never calls Supabase directly.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Uploaded files are inert documents: no scripts, no plugins, sandboxed.
const fileSecurityPolicy = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";

const privateHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Uploads (max 4 MB file + form overhead); Vercel caps requests at 4.5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: baseSecurityHeaders },
      {
        // Pages get the app CSP; staff files (below) get a stricter one.
        source: "/((?!intern/bestanden/).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
      {
        source: "/intern/bestanden/:path*",
        headers: [...privateHeaders, { key: "Content-Security-Policy", value: fileSecurityPolicy }],
      },
      { source: "/intern/:path*", headers: privateHeaders },
      { source: "/login", headers: privateHeaders },
      { source: "/wachtwoord-:slug", headers: privateHeaders },
      {
        // One-time tokens live in this URL: never leak it via Referer.
        source: "/activeren",
        headers: [...privateHeaders, { key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
