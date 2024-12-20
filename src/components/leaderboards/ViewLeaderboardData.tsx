import useLeaderboard from '@/hooks/boardwalk/useLeaderboard';
import { Tabs } from '@/components/utility/Tabs';
import { useEffect, useState } from 'react';
import LeaderboardTable from './LeaderboardTable';
import UserStatsCard from './UserStatsCard';

const tabs = [
   { title: 'Daily', value: '24hr', index: 0 },
   { title: 'Weekly', value: '7d', index: 1 },
] as const

const getTabByTimeRange = (timeRange: '24hr' | '7d') => {
   return tabs.find(x => x.value === timeRange) ?? tabs[0];
}

const ViewLeaderboardData = () => {
   const [currentPage, setCurrentPage] = useState(1);
   const {
      data: leaderboardData,
      loading,
      load: loadLeaderboardData,
      userData,
      timeRange,
      setTimeRange,
   } = useLeaderboard();

   const activeTab = getTabByTimeRange(timeRange);

   useEffect(() => {
      loadLeaderboardData();
      return () => {};
   }, []);

   return (
      <>
         {loading || leaderboardData === null ? (
            <div className='flex justify-center mt-4'>Loading...</div>
         ) : (
            <div className='flex flex-col h-full mb-16'>
               <div className='mb-4'>
                  <Tabs
                     value={activeTab.index}
                     onChange={index => setTimeRange(tabs[index].value)}
                     titles={['Daily', 'Weekly']}
                  />
               </div>
               {Object.entries(leaderboardData).length > 0 ? (
                  <LeaderboardTable
                     title='Top Rankings'
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
                     <div className='grid grid-cols-1 gap-6 text-black'>
                        <UserStatsCard title='eGIFTS SENT' userData={userData.sent || undefined} />
                        <UserStatsCard
                           title='eGIFTS RECEIVED'
                           userData={userData.received || undefined}
                        />
                     </div>
                  </div>
               )}
            </div>
         )}
      </>
   );
};

export default ViewLeaderboardData;
