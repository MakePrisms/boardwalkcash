import { updateHideFromLeaderboardAction } from '@/redux/slices/UserSlice';
import { RootState, useAppDispatch } from '@/redux/store';
import { GiftMetrics, LeaderboardResponse } from '@/types';
import { updateUser } from '@/utils/appApiRequests';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useToast } from '../util/useToast';

const useLeaderboard = () => {
   const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse>({});
   const [userData, setUserData] = useState<{ sent: GiftMetrics; received: GiftMetrics } | null>(
      null,
   );
   const [data, setData] = useState<{
      // senderMetrics: Record<string, GiftMetrics>;
      receiverMetrics: Record<string, GiftMetrics>;
   } | null>(null);
   const [loading, setLoading] = useState(true);
   const [timeRange, setTimeRange] = useState<'24hr' | '7d'>('24hr');
   const hideFromLeaderboard = useSelector((state: RootState) => state.user.hideFromLeaderboard);
   const { addToast } = useToast();

   const dispatch = useAppDispatch();

   const fetchLeaderboardData = async () => {
      try {
         const pubkey = window.localStorage.getItem('pubkey');
         const response = await axios.get<any, { data: LeaderboardResponse }>(
            `/api/metrics/leaderboard?periods=24hr,7d${pubkey ? `&pubkey=${pubkey}` : ''}`,
         );
         setLeaderboardData(response.data);
         setUserData(response.data[timeRange]?.userData || null);
         setData(response.data[timeRange]);
      } catch (error) {
         console.error('Error fetching leaderboard data:', error);
      }
   };

   useEffect(() => {
      if (!leaderboardData[timeRange]) return;
      setData(leaderboardData[timeRange]);
      setUserData(leaderboardData[timeRange].userData || null);
   }, [leaderboardData, timeRange]);

   const load = async () => {
      fetchLeaderboardData()
         .then(() => {
            setTimeout(() => {
               setLoading(false);
            }, 300);
         })
         .catch(() => {
            alert('Failed to load leaderboard data');
            setLoading(false);
         });
   };

   const updateHideFromLeaderboard = async (hide: boolean) => {
      const pubkey = window.localStorage.getItem('pubkey');
      if (!pubkey) throw new Error('No pubkey found');
      await updateUser(pubkey, { hideFromLeaderboard: hide });
      dispatch(updateHideFromLeaderboardAction(hide));
      const toastMessage = hide
         ? 'Gifts sent to you will no longer be shown on the leaderboard'
         : 'Gifts sent to you will be shown on the leaderboard';
      addToast(toastMessage, 'success');
   };

   return {
      data,
      load,
      loading,
      userData,
      setTimeRange,
      hideFromLeaderboard,
      updateHideFromLeaderboard,
   };
};

export default useLeaderboard;
