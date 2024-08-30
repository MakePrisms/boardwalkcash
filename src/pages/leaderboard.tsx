import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Modal, Table, Navbar } from 'flowbite-react';
import { GiftMetrics, LeaderboardResponse } from '@/types';
import { formatCents } from '@/utils/formatting';
import Image from 'next/image';

const Leaderboard = () => {
   const [topGiftSender, setTopGiftSender] = useState<Record<string, GiftMetrics>>({});
   const [topGiftReceiver, setTopGiftReceiver] = useState<Record<string, GiftMetrics>>({});
   const [selectedGifts, setSelectedGifts] = useState<{ [giftName: string]: number } | null>(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [userData, setUserData] = useState<{ sent: GiftMetrics; received: GiftMetrics } | null>(
      null,
   );

   useEffect(() => {
      if (!topGiftSender || !topGiftReceiver) return;
      const pubkey = window.localStorage.getItem('pubkey');
      if (pubkey) {
         const sendingData = topGiftSender[pubkey];
         const receivingData = topGiftReceiver[pubkey];
         setUserData({ sent: sendingData, received: receivingData });
         console.log('data', { sent: sendingData, received: receivingData });
      }
   }, [topGiftReceiver, topGiftSender]);

   useEffect(() => {
      const fetchLeaderboardData = async () => {
         try {
            const response = await axios.get<any, { data: LeaderboardResponse }>(
               '/api/metrics/leaderboard',
            );
            setTopGiftSender(response.data.senderMetrics);
            setTopGiftReceiver(response.data.receiverMetrics);
         } catch (error) {
            console.error('Error fetching leaderboard data:', error);
         }
      };

      fetchLeaderboardData();
   }, []);

   const handleRowClick = (giftCount: { [giftName: string]: number }) => {
      setSelectedGifts(giftCount);
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedGifts(null);
   };

   return (
      <>
         <Navbar fluid className='bg-boardwalk-blue'>
            <Navbar.Brand href='/'>
               <Image src='/favicon.ico' width={64} height={64} alt='Boardwalk Logo' />
               <span className='self-center whitespace-nowrap text-xl font-semibold dark:text-white ml-3'>
                  Leaderboard
               </span>
            </Navbar.Brand>
         </Navbar>
         <div className='container mx-auto mt-8'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8  text-black mt-8'>
               <Card>
                  <h2 className='text-xl  mb-4'>Top Gift Senders</h2>
                  <Table>
                     <Table.Head>
                        <Table.HeadCell>User</Table.HeadCell>
                        <Table.HeadCell>Gifts Sent</Table.HeadCell>
                        <Table.HeadCell>Total Amount Sent</Table.HeadCell>
                     </Table.Head>
                     <Table.Body>
                        {Object.entries(topGiftSender).map(([_, data]) => (
                           <Table.Row
                              key={data.username}
                              onClick={() => handleRowClick(data.giftCount)}
                              className='cursor-pointer hover:bg-gray-100'
                           >
                              <Table.Cell>{data.username}</Table.Cell>
                              <Table.Cell>{data.total}</Table.Cell>
                              <Table.Cell>{formatCents(data.totalAmountCents)}</Table.Cell>
                           </Table.Row>
                        ))}
                     </Table.Body>
                  </Table>
               </Card>
               <Card>
                  <h2 className='text-xl  mb-4'>Top Gift Receivers</h2>
                  <Table>
                     <Table.Head>
                        <Table.HeadCell>User</Table.HeadCell>
                        <Table.HeadCell>Gifts Received</Table.HeadCell>
                        <Table.HeadCell>Total Amount Received</Table.HeadCell>
                     </Table.Head>
                     <Table.Body>
                        {Object.entries(topGiftReceiver).map(([_, data]) => (
                           <Table.Row
                              key={data.username}
                              onClick={() => handleRowClick(data.giftCount)}
                              className='cursor-pointer hover:bg-gray-100'
                           >
                              <Table.Cell>{data.username}</Table.Cell>
                              <Table.Cell>{data.total}</Table.Cell>
                              <Table.Cell>{formatCents(data.totalAmountCents)}</Table.Cell>
                           </Table.Row>
                        ))}
                     </Table.Body>
                  </Table>
               </Card>
            </div>
            {userData && (
               <div className='mt-8'>
                  <h2 className='text-2xl font-bold mb-4 text-center'>Your Stats</h2>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-black'>
                     <Card
                        onClick={() => handleRowClick(userData.sent?.giftCount)}
                        className='transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:cursor-pointer '
                     >
                        <h3 className='text-xl mb-2'>Gifts Sent</h3>
                        <p>Total: {userData.sent?.total || 0}</p>
                        <p>Amount: {formatCents(userData.sent?.totalAmountCents || 0)}</p>
                     </Card>
                     <Card
                        onClick={() => handleRowClick(userData.received?.giftCount)}
                        className='transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:cursor-pointer '
                     >
                        <h3 className='text-xl mb-2'>Gifts Received</h3>
                        <p>Total: {userData.received?.total || 0}</p>
                        <p>Amount: {formatCents(userData.received?.totalAmountCents || 0)}</p>
                     </Card>
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
