import type { NextConfig } from "next";
import { execSync } from "child_process";

function getGitSha(): string {
  // Prefer build arg (Docker), fall back to git command (local dev)
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitSha(),
  },
};

export default nextConfig;
