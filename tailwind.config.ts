/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
      'node_modules/flowbite-react/lib/esm/**/*.js',
   ],
   theme: {
      extend: {
         backgroundImage: {
            // 'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            // 'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
         },
         fontFamily: {
            teko: ['Teko', 'sans-serif'],
            'kode-mono': ['Kode Mono', 'monospace'],
         },
         colors: {
            'cyan-teal': '#26A69A',
            'cyan-teal-dark': '#1E7A6E',
         },
      },
   },
   plugins: [require('flowbite/plugin')],
};
