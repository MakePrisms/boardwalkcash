import { RootState } from '@/redux/store';
import { GenerateNostrOtpRequest, VerifyNostrOtpRequest, VerifyNostrOtpResponse } from '@/types';
import { authenticatedRequest } from '@/utils/appApiRequests';
import { useSelector } from 'react-redux';

const useNostrLogin = () => {
   const { pubkey: userPubkey, nostrPubkey } = useSelector((state: RootState) => state.user);
   const generateAndSendOtp = async (pubkey: string) => {
      if (!userPubkey) {
         throw new Error('No user pubkey found');
      }
      await authenticatedRequest<any>(`/api/users/${userPubkey}/nostr-otp/generate`, 'POST', {
         nostrPubkey: pubkey,
      } as GenerateNostrOtpRequest);
   };

   const submitOtp = async (otp: string) => {
      if (!userPubkey) {
         throw new Error('No user pubkey found');
      }
      return await authenticatedRequest<VerifyNostrOtpResponse>(
         `/api/users/${userPubkey}/nostr-otp/verify`,
         'POST',
         {
            otp,
         } as VerifyNostrOtpRequest,
      );
   };

   const logout = async () => {
      if (!userPubkey) {
         throw new Error('No user pubkey found');
      }
      await authenticatedRequest<any>(`/api/users/${userPubkey}`, 'PUT', {
         nostrPubkey: null,
      });
   };

   return {
      generateAndSendOtp,
      submitOtp,
      logout,
      nostrPubkey,
   };
};

export default useNostrLogin;
