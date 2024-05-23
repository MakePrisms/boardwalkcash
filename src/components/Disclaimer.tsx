import Link from 'next/link';

const Disclaimer = () => {
   return (
      <div>
         <div className='flex items-center justify-center space-x-2 mb-4'>
            <p>
               Boardwalk Cash is{' '}
               <a
                  className='text-cyan-teal hover:underline'
                  href='https://github.com/MakePrisms/boardwalkcash'
                  target='__blank'
               >
                  open source
               </a>{' '}
               and{' '}
               <Link className='hover:underline text-cyan-teal' href={'/warning'} target='_blank'>
                  experimental
               </Link>
               . Use at your own risk!
            </p>
         </div>
      </div>
   );
};

export default Disclaimer;
