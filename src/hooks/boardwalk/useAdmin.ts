import { useState } from 'react';
import axios from 'axios';

const useAdminRequest = () => {
   const adminPassword = localStorage.getItem('adminPassword');

   const sendAdminRequest = async (url: string, method: 'GET' | 'POST' | 'DELETE', data?: any) => {
      try {
         const response = await axios({
            method,
            url,
            data,
            headers: {
               Authorization: `Basic ${btoa(`admin:${adminPassword}`)}`,
            },
         });
         return response.data;
      } catch (error) {
         console.error('Admin request failed:', error);
         throw error;
      }
   };

   return sendAdminRequest;
};

const useAdmin = () => {
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const sendAdminRequest = useAdminRequest();

   const createCampaign = async (campaignData: {
      name: string;
      nwcUri: string;
      giftId: number;
      totalGifts: number;
   }) => {
      setIsLoading(true);
      setError(null);

      try {
         const result = await sendAdminRequest('/api/campaigns/single-gift', 'POST', campaignData);
         setIsLoading(false);
         return result;
      } catch (err) {
         setIsLoading(false);
         setError('Failed to create campaign');
         throw err;
      }
   };

   const getActiveCampaigns = async () => {
      try {
         const result = await sendAdminRequest('/api/campaigns/single-gift?active=true', 'GET');
         return result;
      } catch (err) {
         throw err;
      }
   };

   const getInactiveCampaigns = async () => {
      try {
         const result = await sendAdminRequest('/api/campaigns/single-gift?active=false', 'GET');
         return result;
      } catch (err) {
         throw err;
      }
   };

   const deleteCampaign = async (id: number) => {
      try {
         await sendAdminRequest(`/api/campaigns/single-gift?id=${id}`, 'DELETE');
      } catch (err) {
         throw err;
      }
   };

   return {
      createCampaign,
      isLoading,
      error,
      getActiveCampaigns,
      getInactiveCampaigns,
      deleteCampaign,
   };
};

export default useAdmin;
