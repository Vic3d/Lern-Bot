/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14: experimental.serverComponentsExternalPackages
  // Next.js 15: serverExternalPackages
  // pdfjs-dist NICHT durch webpack bundlen — Worker-Pfad muss auf echte Datei zeigen
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'canvas'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
