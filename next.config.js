/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        canvas: false,
      };
    }
    // pdfjs-dist: canvas optional
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  // pdfjs-dist als external markieren (läuft nur server-side)
  serverExternalPackages: ['pdfjs-dist'],
};

module.exports = nextConfig;
