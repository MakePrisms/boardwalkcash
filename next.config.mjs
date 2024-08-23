import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,
   swcMinify: true, // Enable SWC minification for improved performance
   compiler: {
      removeConsole: process.env.NODE_ENV !== 'development', // Remove console.log in production
   },
   async rewrites() {
      return [
         {
            source: '/.well-known/lnurlp/:slug',
            destination: '/api/lnurlp/:slug',
         },
         {
            source: '/.well-known/nostr.json',
            destination: '/api/nostr/nip05',
         },
      ];
   },
   images: {
      domains: ['localhost'],
      minimumCacheTTL: 60 * 60 * 24 * 7, // 1 week
   },
   async headers() {
      return [
         {
            source: '/eGifts/:path*',
            headers: [
               {
                  key: 'Cache-Control',
                  value: 'public, max-age=604800', // 1 week
               },
            ],
         },
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
