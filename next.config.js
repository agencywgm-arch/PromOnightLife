/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverActions: {
      // Les slides composées (base64 1080×1920) dépassent la limite de 1 Mo
      bodySizeLimit: "20mb",
    },
  },
};

module.exports = nextConfig;
