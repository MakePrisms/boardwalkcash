// import React, { useState } from 'react';
// import useAdmin from '@/hooks/boardwalk/useAdmin';

// const CampaignsPage = ({ gifts }: { gifts: GetAllGiftsResponse['gifts'] }) => {
//    const router = useRouter();
//    const { createCampaign, isLoading, error } = useAdmin();
//    const { addToast } = useToast();
//    const [formData, setFormData] = useState({
//       name: '',
//       nwcUri: '',
//       giftId: '',
//       totalGifts: '',
//    });

//    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//       const { name, value } = e.target;
//       setFormData(prevState => ({
//          ...prevState,
//          [name]: value,
//       }));
//    };

//    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//       e.preventDefault();
//       const campaignData = {
//          ...formData,
//          giftId: parseInt(formData.giftId),
//          totalGifts: parseInt(formData.totalGifts),
//       };

//       if (!formData.giftId) {
//          addToast('Gift ID is required', 'error');
//          return;
//       }

//       try {
//          const result = await createCampaign(campaignData);
//          console.log('Campaign created:', result);
//          // Reset form after successful creation
//          setFormData({
//             name: '',
//             nwcUri: '',
//             giftId: '',
//             totalGifts: '',
//          });
//          router.push('/admin/campaigns/active');
//          addToast('Campaign created!', 'success');
//       } catch (err) {
//          console.error('Error creating campaign:', err);
//       }
//    };

//    const handleGiftClick = (gift: { id: number }) => {
//       setFormData({
//          ...formData,
//          giftId: gift.id.toString(),
//       });
//    };

//    return (
//       <div className='container mx-auto px-4 py-8'>
//          <Button as={Link} href='/admin/campaigns/active'>
//             Active Campaigns
//          </Button>
//          <div className='mb-8'>
//             <h1 className='text-2xl font-bold mb-4'>Which gift?</h1>
//             <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
//                {gifts.map(gift => (
//                   <div key={gift.name} className='flex flex-col items-center'>
//                      <button
//                         onClick={() => handleGiftClick(gift)}
//                         className='transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg'
//                      >
//                         <StickerItem
//                            selectedSrc={gift.selectedSrc}
//                            unselectedSrc={gift.unselectedSrc}
//                            isSelected={formData.giftId === gift.id.toString()}
//                            alt={gift.name}
//                            size='md'
//                            count={gift.campaignId ? gift.campaignId : undefined}
//                         />
//                      </button>
//                      {gift.campaignId && (
//                         <div className='mt-2'>
//                            <p className='text-xs text-gray-500'>Campaign</p>
//                         </div>
//                      )}
//                   </div>
//                ))}
//             </div>
//          </div>
//          <div className='bg-white shadow-md rounded-lg p-6'>
//             <h1 className='text-2xl font-bold mb-6 text-black'>Create Campaign</h1>
//             <form onSubmit={handleSubmit} className='space-y-4'>
//                <div>
//                   <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
//                      Name:
//                   </label>
//                   <input
//                      type='text'
//                      id='name'
//                      name='name'
//                      value={formData.name}
//                      onChange={handleInputChange}
//                      required
//                      className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50'
//                   />
//                </div>

//                <div>
//                   <label htmlFor='nwcUri' className='block text-sm font-medium text-gray-700'>
//                      NWC URI:
//                   </label>
//                   <input
//                      type='password'
//                      id='nwcUri'
//                      name='nwcUri'
//                      value={formData.nwcUri}
//                      onChange={handleInputChange}
//                      required
//                      className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50'
//                   />
//                </div>
//                <div>
//                   <label htmlFor='totalGifts' className='block text-sm font-medium text-gray-700'>
//                      Total Gifts:
//                   </label>
//                   <input
//                      type='number'
//                      id='totalGifts'
//                      name='totalGifts'
//                      value={formData.totalGifts}
//                      onChange={handleInputChange}
//                      required
//                      className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50'
//                   />
//                </div>
//                <Button type='submit' isProcessing={isLoading} className='w-full'>
//                   Create Campaign
//                </Button>
//             </form>
//             {isLoading && <p className='mt-4 text-center text-gray-500'>Loading...</p>}
//             {error && <p className='mt-4 text-center text-red-500'>Error: {error}</p>}
//          </div>
//       </div>
//    );
// };

// import { GetServerSideProps } from 'next';
// import { getAllGifts } from '@/lib/gifts';
// import { GetAllGiftsResponse } from '@/types';
// import StickerItem from '@/components/eGifts/stickers/StickerItem';
// import { Button } from 'flowbite-react';
// import Link from 'next/link';
// import { useToast } from '@/hooks/util/useToast';
// import { useRouter } from 'next/router';

// export const getServerSideProps: GetServerSideProps = async () => {
//    try {
//       /* only show inactive gifts for creating a campaign */
//       const gifts = await getAllGifts(false);
//       console.log('gifts', gifts);
//       return {
//          props: {
//             gifts: gifts
//                .filter(g => !g.SingleGiftCampaign)
//                .map(g => ({
//                   name: g.name,
//                   id: g.id,
//                   imageUrlUnselected: g.imageUrlUnselected,
//                   imageUrlSelected: g.imageUrlSelected,
//                })),
//          },
//       };
//    } catch (error) {
//       console.error('Failed to fetch gifts:', error);
//       return {
//          props: { gifts: [] },
//       };
//    }
// };

// export default CampaignsPage;
