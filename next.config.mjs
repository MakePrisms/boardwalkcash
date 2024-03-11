// Using ES module syntax for export
/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,

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

export default nextConfig;
