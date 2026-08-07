import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bcryptjs", "@ffmpeg-installer/ffmpeg", "fluent-ffmpeg", "openai"],
};

export default nextConfig;
