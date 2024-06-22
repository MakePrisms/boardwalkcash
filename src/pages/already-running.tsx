import { Button } from 'flowbite-react';

const AlreadyRunning = () => {
   return (
      <main
         className='flex flex-col items-center justify-center mx-auto md:max-w-screen-sm space-y-4'
         style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      >
         <h1 className='text-3xl'>Already Running</h1>
         <p className='text-center'>
            It looks like you already have Boardwalk running in another tab. Close one and retry.
         </p>
         <Button onClick={() => (window.location.href = '/wallet')}>Retry</Button>
      </main>
   );
};

export default AlreadyRunning;
