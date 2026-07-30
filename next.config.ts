import type { NextConfig } from "next";

import { PUBLIC_MEDIA_ENTITY_CONFIG } from "./features/public-media/model";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl = supabaseUrl ? new URL(supabaseUrl) : null;
const signedMediaPatterns = parsedSupabaseUrl
  ? Object.values(PUBLIC_MEDIA_ENTITY_CONFIG).map((entity) => ({
      protocol: parsedSupabaseUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: parsedSupabaseUrl.hostname,
      port: parsedSupabaseUrl.port,
      pathname: `/storage/v1/object/sign/tourism-media/${entity.pathPrefix}/**`,
    }))
  : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: signedMediaPatterns,
  },
  experimental: {
    serverActions: {
      // The application accepts images up to 5 MiB; multipart metadata needs
      // a small amount of additional request space.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
