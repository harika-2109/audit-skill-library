/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://audit-skill-library.onrender.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;