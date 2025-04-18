import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticatedRequest, request } from '@/utils/appApiRequests';
import { computeTxId, getMintFromToken } from '@/utils/cashu';
import {
   GetAllGiftsResponse,
   GetGiftResponse,
   GetTokenResponse,
   GiftAsset,
   PostSendGiftResponse,
} from '@/types';
import { Token, getEncodedTokenV4 } from '@cashu/cashu-ts';
import useContacts from './useContacts';
import { RootState, useAppDispatch } from '@/redux/store';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { addTransaction, TxStatus } from '@/redux/slices/HistorySlice';
import { giftMetadata } from '@/lib/gifts/giftMetadata';

interface GiftContextType {
   giftAssets: Record<string, GiftAsset>;
   getGiftById: (id: number) => GiftAsset | null;
   getGiftFromToken: (token: string | Token) => Promise<GiftAsset | null>;
   loadingGifts: boolean;
   fetchGift: (identifier: number) => Promise<GiftAsset | null>;
   loadUserCustomGifts: (creatorPubkey: string) => Promise<void>;
   sendCampaignGift: (
      gift: GiftAsset,
      recipientPubkey: string,
   ) => Promise<{ txid: string; token: string }>;
}

const GiftContext = createContext<GiftContextType | undefined>(undefined);

interface GiftProviderProps {
   children: ReactNode;
}

export const GiftProvider: React.FC<GiftProviderProps> = ({ children }) => {
   const [giftAssets, setGiftAssets] = useState<Record<number, GiftAsset>>({});
   const [isFetching, setIsFetching] = useState(false);
   const user = useSelector((state: RootState) => state.user);
   const { isContactAdded } = useContacts();
   const router = useRouter();
   const dispatch = useAppDispatch();

   useEffect(() => {
      const fetchGifts = async () => {
         setIsFetching(true);
         try {
            const normalizedGifts = normalizeGifts(giftMetadata);
            setGiftAssets(normalizedGifts);
            await preloadAndCacheImages(Object.values(normalizedGifts).map(g => g.selectedSrc));
            await preloadAndCacheImages(Object.values(normalizedGifts).map(g => g.unselectedSrc));
         } catch (error) {
            console.error('Failed to fetch gifts:', error);
         }
         setIsFetching(false);
      };

      fetchGifts();
   }, []);

   /* used to load gifts created by the user, after a contact is added */
   const loadUserCustomGifts = async (creatorPubkey: string) => {
      const apiGifts = await request<GetAllGiftsResponse>('/api/gifts', 'GET');
      const creatorGifts = apiGifts.gifts.filter(g => g.creatorPubkey === creatorPubkey);
      const normalizedGifts = normalizeGifts(creatorGifts, true);
      setGiftAssets(prevGifts => ({ ...prevGifts, ...normalizedGifts }));
   };

   const normalizeGifts = (
      apiGifts: GetAllGiftsResponse['gifts'],
      force: boolean = false,
   ): Record<string, GiftAsset> => {
      return apiGifts.reduce(
         (acc, gift) => {
            const userLoaded = user.status === 'succeeded';
            /* hack so that gifts load on profile page (user might not be initialized) */
            const isUsernamePage = router.query.slug !== undefined;
            /* Only load custom gifts if there is an intialized user and the gift creator is a contact */
            if (
               !isUsernamePage &&
               !force &&
               userLoaded &&
               gift.creatorPubkey &&
               !isContactAdded({ pubkey: gift.creatorPubkey })
            ) {
               return acc;
            }

            acc[gift.id] = gift;
            return acc;
         },
         {} as Record<string, GiftAsset>,
      );
   };

   const preloadAndCacheImage = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
         const img = new Image();
         img.src = src;
         img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            canvas.toDataURL();
            resolve();
         };
         img.onerror = reject;
      });
   };

   const preloadAndCacheImages = async (srcs: string[]): Promise<void> => {
      await Promise.all(srcs.map(preloadAndCacheImage));
   };

   const fetchGift = async (identifier: number): Promise<GiftAsset | null> => {
      const apiGift = await request<GetGiftResponse>(`/api/gifts/${identifier}`, 'GET');
      if (!apiGift) {
         return null;
      }
      return normalizeGifts([apiGift], true)[identifier];
   };

   const getGiftById = (id: number): GiftAsset | null => {
      return giftAssets[id] || null;
   };

   const getGiftFromToken = async (token: string | Token): Promise<GiftAsset | null> => {
      try {
         const txid =
            typeof token === 'string' ? computeTxId(token) : computeTxId(getEncodedTokenV4(token));
         const { giftId } = await request<GetTokenResponse>(`/api/token/${txid}`, 'GET');
         if (!giftId) return null;
         const localGift = getGiftById(giftId) || null;
         if (localGift) {
            return localGift;
         } else {
            return await fetchGift(giftId);
         }
      } catch (e) {
         return null;
      }
   };

   const sendCampaignGift = async (
      gift: GiftAsset,
      recipientPubkey: string,
   ): Promise<PostSendGiftResponse> => {
      try {
         const response = await authenticatedRequest<PostSendGiftResponse>(
            '/api/campaigns/single-gift/send',
            'POST',
            { campaignId: gift.campaingId, recipientPubkey },
         );

         if (response && response.txid && response.token) {
            /* remove gift from list of sendable gifts */
            setGiftAssets(prevGifts => {
               const newGifts = Object.fromEntries(
                  Object.entries(prevGifts).filter(([giftName]) => giftName !== gift.name),
               );
               return newGifts;
            });

            const mint = getMintFromToken(response.token);
            dispatch(
               addTransaction({
                  type: 'ecash',
                  transaction: {
                     amount: gift.amount,
                     date: new Date().toLocaleString(),
                     token: response.token,
                     status: TxStatus.PENDING,
                     unit: 'usd',
                     mint: mint,
                     giftId: gift.id,
                     fee: undefined,
                     pubkey: '02' + recipientPubkey,
                  },
               }),
            );

            return { txid: response.txid, token: response.token };
         } else {
            throw new Error('Invalid response from server');
         }
      } catch (error) {
         console.error('Error sending campaign gift:', error);
         throw error;
      }
   };

   const value: GiftContextType = {
      giftAssets,
      getGiftById,
      getGiftFromToken,
      loadingGifts: isFetching,
      fetchGift,
      loadUserCustomGifts,
      sendCampaignGift,
   };

   return <GiftContext.Provider value={value}>{children}</GiftContext.Provider>;
};

const useGifts = (): GiftContextType => {
   const context = useContext(GiftContext);
   if (context === undefined) {
      throw new Error('useGifts must be used within a GiftProvider');
   }
   return context;
};

export default useGifts;
