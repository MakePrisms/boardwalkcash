import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
   const router = useRouter();

   useEffect(() => {
      const localKeysets = window.localStorage.getItem('keysets');

      if (localKeysets) {
         router.push('/wallet');
      } else {
         router.push('/setup');
      }
   });

   return;
}
