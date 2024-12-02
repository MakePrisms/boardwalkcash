import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps, GetServerSidePropsContext } from 'next/types';
import { getRequestedDomainFromRequest } from '@/utils/url';

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

export const getServerSideProps: GetServerSideProps = async (
   context: GetServerSidePropsContext,
) => {
   const baseRequestUrl = getRequestedDomainFromRequest(context.req);

   return {
      props: {
         baseRequestUrl,
      },
   };
};
