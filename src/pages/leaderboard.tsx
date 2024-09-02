import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Navbar, Button, Tabs } from 'flowbite-react';
import { GiftMetrics, LeaderboardResponse } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import LoadingPage from '@/components/LoadingPage';
import LeaderboardTable from '@/components/LeaderboardTable';
import { leaderboardTabTheme } from '@/themes/tabThemes';
import UserStatsCard from '@/components/UserStatsCard';

const Leaderboard = () => {
   const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse>({});
   const [selectedGifts, setSelectedGifts] = useState<{ [giftName: string]: number } | null>(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [userData, setUserData] = useState<{ sent: GiftMetrics; received: GiftMetrics } | null>(
      null,
   );
   const [loading, setLoading] = useState(true);
   const [currentSenderPage, setCurrentSenderPage] = useState(1);
   const [currentReceiverPage, setCurrentReceiverPage] = useState(1);
   const [activeTab, setActiveTab] = useState<'24hr' | '7d'>('24hr');

   useEffect(() => {
      if (!leaderboardData[activeTab]) return;

      /* don't set userData if boardwalk not initialized */
      const pubkey = window.localStorage.getItem('pubkey');
      if (!pubkey) return;

      const sendingData = leaderboardData[activeTab].senderMetrics[pubkey];
      const receivingData = leaderboardData[activeTab].receiverMetrics[pubkey];
      setUserData({ sent: sendingData, received: receivingData });
   }, [leaderboardData, activeTab]);

   useEffect(() => {
      const fetchLeaderboardData = async () => {
         try {
            const response = await axios.get<any, { data: LeaderboardResponse }>(
               '/api/metrics/leaderboard?periods=24hr,7d',
            );
            setLeaderboardData(response.data);
         } catch (error) {
            console.error('Error fetching leaderboard data:', error);
         }
      };

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
   }, []);

   const handleRowClick = (giftCount: { [giftName: string]: number }) => {
      setSelectedGifts(giftCount);
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedGifts(null);
   };

   if (loading) return <LoadingPage />;

   const currentData = leaderboardData[activeTab] || { senderMetrics: {}, receiverMetrics: {} };

   return (
      <>
         <Navbar fluid className='bg-boardwalk-blue'>
            <Navbar.Brand href='/'>
               <Image src='/favicon.ico' width={64} height={64} alt='Boardwalk Logo' />
               <span className='self-center whitespace-nowrap text-xl font-semibold dark:text-white ml-3'>
                  Leaderboard
               </span>
            </Navbar.Brand>
            <div className='flex md:order-2'>
               {userData && (
                  <Button className='btn-bg-blend'>
                     <Link href='/wallet'>Back</Link>
                  </Button>
               )}
            </div>
         </Navbar>
         <div className='container mx-auto mt-8'>
            <div className=''>
               <Tabs
                  style='underline'
                  onActiveTabChange={tab => setActiveTab(tab === 0 ? '24hr' : '7d')}
                  theme={leaderboardTabTheme}
               >
                  <Tabs.Item active title='24 Hours'></Tabs.Item>
                  <Tabs.Item title='1 Week'></Tabs.Item>
               </Tabs>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 text-black mt-8'>
               <LeaderboardTable
                  title='Top Gift Senders'
                  data={currentData.senderMetrics}
                  currentPage={currentSenderPage}
                  onPageChange={setCurrentSenderPage}
                  onRowClick={handleRowClick}
               />
               <LeaderboardTable
                  title='Top Gift Receivers'
                  data={currentData.receiverMetrics}
                  currentPage={currentReceiverPage}
                  onPageChange={setCurrentReceiverPage}
                  onRowClick={handleRowClick}
               />
            </div>
            {userData && (
               <div className='mt-8'>
                  <h2 className='text-2xl font-bold mb-4 text-center'>Your Stats</h2>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-black'>
                     <UserStatsCard
                        title='Gifts Sent'
                        userData={userData.sent}
                        onRowClick={handleRowClick}
                     />
                     <UserStatsCard
                        title='Gifts Received'
                        userData={userData.received}
                        onRowClick={handleRowClick}
                     />
                  </div>
               </div>
            )}
            {selectedGifts && (
               <ViewTotalGiftsModal
                  isOpen={isModalOpen}
                  onClose={closeModal}
                  giftsData={selectedGifts}
               />
            )}
         </div>
      </>
   );
};

interface ViewTotalGiftsModalProps {
   isOpen: boolean;
   onClose: () => void;
   giftsData: { [giftName: string]: number };
}

const ViewTotalGiftsModal = ({ isOpen, onClose, giftsData }: ViewTotalGiftsModalProps) => {
   return (
      <Modal show={isOpen} onClose={onClose} className='text-black'>
         <Modal.Header>Total Gifts</Modal.Header>
         <Modal.Body>
            {Object.entries(giftsData).map(([giftName, count]) => (
               <div key={giftName}>
                  <h3>
                     {giftName}: {count}
                  </h3>
               </div>
            ))}
         </Modal.Body>
      </Modal>
   );
};

export default Leaderboard;
