import { Navbar } from 'flowbite-react';
import ViewLeaderboardData from '@/components/leaderboards/ViewLeaderboardData';

const Leaderboard = () => {
   return (
      <div className='bg-[#0f1f41ff] min-h-screen flex flex-col'>
         <Navbar className='bg-[#0f3470] h-16'>
            <span className='self-center whitespace-nowrap text-xl font-semibold dark:text-white my-2 ml-3'>
               Boardwalk Leaderboard
            </span>
         </Navbar>
         <div className='flex-grow flex justify-center items-start'>
            <div className='w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-16'>
               <ViewLeaderboardData />
            </div>
         </div>
         <div className='h-16 bg-[#0f1f41ff]'></div>
      </div>
   );
};

export default Leaderboard;
