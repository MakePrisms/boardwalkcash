import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Enable SWC minification for improved performance
  compiler: {
    removeConsole: process.env.NODE_ENV !== "development", // Remove console.log in production
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/lnurlp/:slug',
        destination: '/api/lnurlp/:slug',
      },
      // ... other rewrites if necessary
    ];
  },
};

const pwaConfig = {
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
};

export default withPWA(pwaConfig)({
  ...nextConfig,
});
