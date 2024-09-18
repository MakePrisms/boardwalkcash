import useAdmin from '@/hooks/boardwalk/useAdmin';
import { useEffect, useState } from 'react';
import StickerItem from '@/components/eGifts/stickers/StickerItem';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button } from 'flowbite-react';
import Link from 'next/link';

interface Campaign {
   id: number;
   active: boolean;
   name: string;
   nwcUri: string;
   giftId: number;
   totalGifts: number;
   expiresAt: string | null;
   createdAt: string;
   gift: {
      id: number;
      name: string;
      amount: number;
      unit: string;
      description: string;
      imageUrlSelected: string;
      imageUrlUnselected: string;
      creatorPubkey: string | null;
      fee: number | null;
   };
   claimedBy: any[];
}

const ActiveCampaignsPage = () => {
   const { getActiveCampaigns, getInactiveCampaigns, deleteCampaign } = useAdmin();
   const [campaigns, setCampaigns] = useState<Campaign[]>([]);
   const [inactiveCampaigns, setInactiveCampaigns] = useState<Campaign[]>([]);

   useEffect(() => {
      getActiveCampaigns().then(fetchedCampaigns => {
         setCampaigns(fetchedCampaigns);
      });
   }, []);

   useEffect(() => {
      getInactiveCampaigns().then(fetchedCampaigns => {
         setInactiveCampaigns(fetchedCampaigns);
      });
   }, []);

   const handleDeleteCampaign = async (id: number, isActive: boolean) => {
      try {
         await deleteCampaign(id);
         if (isActive) {
            setCampaigns(prevCampaigns => prevCampaigns.filter(campaign => campaign.id !== id));
         } else {
            setInactiveCampaigns(prevCampaigns =>
               prevCampaigns.filter(campaign => campaign.id !== id),
            );
         }
      } catch (error) {
         console.error('Failed to delete campaign:', error);
      }
   };

   const renderCampaign = (campaign: Campaign, isActive: boolean) => (
      <div
         key={campaign.id}
         className='flex flex-col items-center justify-center space-y-4 bg-gray-600 shadow-md rounded-lg p-6 relative'
      >
         <h2>{campaign.name}</h2>
         <StickerItem
            selectedSrc={campaign.gift.imageUrlSelected}
            unselectedSrc={''}
            alt={''}
            isSelected={true}
         />
         <p>Total Gifts: {campaign.totalGifts}</p>
         <p>Total Claimed: {campaign.claimedBy.length}</p>
         <p>Created At: {new Date(campaign.createdAt).toLocaleDateString()}</p>
         {campaign.expiresAt !== null ? (
            <p>Expires At: {new Date(campaign.expiresAt).toLocaleDateString()}</p>
         ) : (
            <p>Expires At: Never</p>
         )}
         <TrashIcon
            className='h-6 w-6 text-red-500 cursor-pointer absolute top-2 right-2'
            onClick={() => handleDeleteCampaign(campaign.id, isActive)}
         />
      </div>
   );

   return (
      <div>
         <Button as={Link} href='/admin/campaigns'>
            Create Campaign
         </Button>
         <h1 className='text-2xl font-bold m-4'>Active Campaigns</h1>
         <div className='grid grid-cols-0 md:grid-cols-2 lg:grid-cols-4 gap-6 px-0 sm:px-6'>
            {Array.isArray(campaigns) && campaigns.map(campaign => renderCampaign(campaign, true))}
         </div>
         <h1 className='text-2xl font-bold m-4'>Inactive Campaigns</h1>
         <div className='grid grid-cols-0 md:grid-cols-2 lg:grid-cols-4 gap-6 px-0 sm:px-6'>
            {Array.isArray(inactiveCampaigns) &&
               inactiveCampaigns.map(campaign => renderCampaign(campaign, false))}
         </div>
      </div>
   );
};

export default ActiveCampaignsPage;
