import { Navbar } from 'flowbite-react';
import ViewLeaderboardData from '@/components/leaderboards/ViewLeaderboardData';

const Leaderboard = () => {
   return (
      <div className='bg-[#0f1f41ff] min-h-screen flex flex-col '>
         <Navbar className='bg-[#0f3470] h-16 flex justify-center items-center'>
            <div className='whitespace-nowrap text-xl font-semibold dark:text-white my-2 w-full text-center'>
               Boardwalk Leaderboard
            </div>
         </Navbar>
         <div className='flex-grow flex justify-center'>
            <div className='max-w-fit mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-16'>
               <ViewLeaderboardData />
            </div>
         </div>
         <div className='h-16 bg-[#0f1f41ff]'></div>
      </div>
   );
};

export default Leaderboard;
