/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["https://agentic-2a826654.vercel.app", "http://localhost:3000"],
    },
  },
};

export default nextConfig;
