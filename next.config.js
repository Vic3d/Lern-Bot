/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfjs-dist nicht durch Next.js bundlen — braucht Zugriff auf Worker-Datei vom Disk
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
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
