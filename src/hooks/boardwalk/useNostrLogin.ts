import { GenerateNostrOtpRequest, VerifyNostrOtpRequest } from '@/types';
import { authenticatedRequest } from '@/utils/appApiRequests';

const useNostrLogin = () => {
   const generateAndSendOtp = async (pubkey: string) => {
      const userPubkey = window.localStorage.getItem('pubkey');

      if (!userPubkey) {
         throw new Error('No user pubkey found');
      }
      await authenticatedRequest<any>(`/api/users/${userPubkey}/nostr-otp/generate`, 'POST', {
         nostrPubkey: pubkey,
      } as GenerateNostrOtpRequest);
   };

   const submitOtp = async (otp: string) => {
      const userPubkey = window.localStorage.getItem('pubkey');

      if (!userPubkey) {
         throw new Error('No user pubkey found');
      }
      await authenticatedRequest<any>(`/api/users/${userPubkey}/nostr-otp/verify`, 'POST', {
         otp,
      } as VerifyNostrOtpRequest);
   };

   return {
      generateAndSendOtp,
      submitOtp,
   };
};

export default useNostrLogin;
