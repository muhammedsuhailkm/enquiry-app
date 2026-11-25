import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Native / Node-only server deps: load from node_modules at runtime instead of bundling.
  serverExternalPackages: ["@node-rs/argon2", "@prisma/adapter-pg", "pg"],
  // Dev only: let phones/other PCs on the home/office Wi-Fi load dev assets + HMR
  // (Next blocks non-localhost origins by default). Matches any 192.168.x.x address,
  // so it keeps working if the router hands this PC a new IP.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
