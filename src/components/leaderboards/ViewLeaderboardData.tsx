import useLeaderboard from '@/hooks/boardwalk/useLeaderboard';
import { Tabs } from 'flowbite-react';
import { useEffect, useState } from 'react';
import LeaderboardTable from './LeaderboardTable';
import UserStatsCard from './UserStatsCard';
import { leaderboardTabTheme } from '@/themes/tabThemes';

const ViewLeaderboardData = () => {
   const [currentPage, setCurrentPage] = useState(1);
   const {
      data: leaderboardData,
      loading,
      load: loadLeaderboardData,
      userData,
      setTimeRange,
   } = useLeaderboard();

   useEffect(() => {
      loadLeaderboardData();
      return () => {};
   }, []);

   return (
      <>
         {loading || leaderboardData === null ? (
            <div className='flex justify-center mt-4'>Loading...</div>
         ) : (
            <div className='flex flex-col h-full'>
               <div className='mb-4'>
                  <Tabs
                     style='underline'
                     onActiveTabChange={tab => setTimeRange(tab === 0 ? '24hr' : '7d')}
                     theme={leaderboardTabTheme}
                  >
                     <Tabs.Item active title='24 Hours'></Tabs.Item>
                     <Tabs.Item title='1 Week'></Tabs.Item>
                  </Tabs>
               </div>
               {Object.entries(leaderboardData).length > 0 ? (
                  <LeaderboardTable
                     title='Top Giftees'
                     data={leaderboardData.receiverMetrics}
                     currentPage={currentPage}
                     onPageChange={setCurrentPage}
                  />
               ) : (
                  <div className='flex justify-center mt-4'>No leaderboard data</div>
               )}
               {userData && (
                  <div className='mt-8'>
                     <h2 className='text-lg mb-4'>Your Stats</h2>
                     <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-black'>
                        <UserStatsCard title='Gifts Sent' userData={userData.sent} />
                        <UserStatsCard title='Gifts Received' userData={userData.received} />
                     </div>
                  </div>
               )}
            </div>
         )}
      </>
   );
};

export default ViewLeaderboardData;
