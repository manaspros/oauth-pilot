/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@oauth-pilot/core", "@oauth-pilot/agent"],
  serverExternalPackages: ["@langchain/langgraph", "@langchain/core", "@langchain/anthropic"],
  typescript: { ignoreBuildErrors: false },
};
export default nextConfig;
