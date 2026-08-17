import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which silently rejects camera-resolution photos
      // (a plain phone/camera photo is routinely 3-8MB) before our own
      // 5MB-per-image check in src/app/sets/actions.ts ever runs — the
      // rejection surfaces as an opaque "Server Components render" error
      // with no useful message. Raised past that 5MB cap, plus the
      // multipart overhead Next's own docs call out.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
