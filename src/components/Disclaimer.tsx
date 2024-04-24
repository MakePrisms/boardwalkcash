const Disclaimer = () => {
   return (
      <div>
         <div className='flex items-center justify-center space-x-2'>
            <p>
               Boardwalk Cash is{' '}
               <a
                  className='text-cyan-teal hover:underline'
                  href='https://github.com/MakePrisms/boardwalkcash'
                  target='__blank'
               >
                  open source
               </a>{' '}
               and still experimental. Use at your own risk!
            </p>
         </div>
      </div>
   );
};

export default Disclaimer;
