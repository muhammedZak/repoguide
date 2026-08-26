/** @type {import('next').NextConfig} */
const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

const nextConfig = {
  agentRules: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
