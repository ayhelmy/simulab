import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile Ant Design packages so Turbopack processes them through Next.js's
  // own bundler, preventing the "createContext is not a function" SSR error that
  // occurs when @ant-design/cssinjs runs in the server module graph.
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/cssinjs', 'rc-util', 'rc-pagination', 'rc-picker'],
  allowedDevOrigins: [
    '172.20.44.1',
    '172.20.44.1:3000',
  ],
  images: {
    remotePatterns: [
      // CloudFront CDN
      { protocol: 'https', hostname: '**.cloudfront.net' },
      
      // ADD YOUR RAILWAY BACKEND DOMAIN HERE
      { protocol: 'https', hostname: '**.up.railway.app' },
      
      // ADD LOCALHOST FOR LOCAL DEVELOPMENT
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
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
