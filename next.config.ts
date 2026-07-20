import type { NextConfig } from "next";

function readBasePath(): string {
  const basePath = process.env.APP_BASE_PATH?.trim() ?? "";

  if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
    throw new Error(
      "APP_BASE_PATH must start with '/' and must not end with '/'. Example: /json-visualizer",
    );
  }

  return basePath;
}

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: readBasePath(),
};

export default nextConfig;
