import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The application accepts images up to 5 MiB; multipart metadata needs
      // a small amount of additional request space.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
