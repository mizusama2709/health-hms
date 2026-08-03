import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which a single uncompressed CT/MRI slice can exceed
      // on its own — a real multi-slice series upload needs real headroom.
      bodySizeLimit: "100mb",
    },
  },
  turbopack: {
    resolveAlias: {
      fs: { browser: "./src/lib/stubs/empty.js" },
      path: { browser: "./src/lib/stubs/empty.js" },
      crypto: { browser: "./src/lib/stubs/empty.js" },
    },
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
};

export default nextConfig;
