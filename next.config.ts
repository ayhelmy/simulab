import type { NextConfig } from 'next';

// Backend origin (no trailing slash), e.g. https://simlearn-backend.up.railway.app.
// When set, /api/v1/* on this app is proxied to the backend so the HttpOnly
// refresh cookie is first-party to the frontend domain — required because
// *.vercel.app and *.up.railway.app are different sites (SameSite=Strict
// cookies would never be sent, and proxy.ts could never see the session).
// Accepts a bare host ("x.up.railway.app") as well as a full URL — Next.js
// rejects rewrite destinations that don't start with http(s)://.
function normalizeBackendUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const BACKEND_URL = normalizeBackendUrl(process.env.BACKEND_URL);

const nextConfig: NextConfig = {
  devIndicators: false,
  // Transpile Ant Design packages so Turbopack processes them through Next.js's
  // own bundler, preventing the "createContext is not a function" SSR error that
  // occurs when @ant-design/cssinjs runs in the server module graph.
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/cssinjs', 'rc-util', 'rc-pagination', 'rc-picker'],
  allowedDevOrigins: [
    '172.20.44.1',
    '172.20.44.1:3000',
    // DEV ONLY — public preview through a Cloudflare quick tunnel (cloudflared).
    '*.trycloudflare.com',
  ],
  images: {
    remotePatterns: [
      // CloudFront CDN for S3-hosted images (SRS §8 AWS S3 + CloudFront)
      { protocol: 'https', hostname: '**.cloudfront.net' },
      // Backend on Railway serves thumbnails / media from its own domain
      { protocol: 'https', hostname: '**.up.railway.app' },
    ],
  },
  async rewrites() {
    if (!BACKEND_URL) return [];
    return [{ source: '/api/v1/:path*', destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        // Global security headers
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Unity WebGL player page needs COOP + COEP so SharedArrayBuffer is available
        // for multi-threaded Unity builds. X-Frame-Options removed here so the
        // simulation iframe can embed backend-served content cross-origin.
        source: '/simulations/:id/play',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        // All other pages keep the clickjacking guard
        source: '/((?!simulations/.*/play).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
