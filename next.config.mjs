/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
