/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // Externalize Lighthouse packages (Next.js 16+)
  serverExternalPackages: ['lighthouse', 'chrome-launcher'],

  // Empty turbopack config to silence webpack warning
  turbopack: {},
};

export default nextConfig;
