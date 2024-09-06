import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { request } from '@/utils/appApiRequests';
import { computeTxId } from '@/utils/cashu';
import { GetAllGiftsResponse, GetGiftResponse, GiftAsset } from '@/types';
import { Gift } from '@prisma/client';
import { Token, getEncodedToken } from '@cashu/cashu-ts';
import useContacts from './useContacts';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/router';

interface GiftContextType {
   giftAssets: Record<string, GiftAsset>;
   getGiftByIdentifier: (identifier: string) => GiftAsset | undefined;
   getGiftFromToken: (token: string | Token) => Promise<GiftAsset | null>;
   loadingGifts: boolean;
   fetchGift: (identifier: string) => Promise<GiftAsset | null>;
   loadUserCustomGifts: (creatorPubkey: string) => Promise<void>;
}

const GiftContext = createContext<GiftContextType | undefined>(undefined);

interface GiftProviderProps {
   children: ReactNode;
}

export const GiftProvider: React.FC<GiftProviderProps> = ({ children }) => {
   const [giftAssets, setGiftAssets] = useState<Record<string, GiftAsset>>({});
   const [isFetching, setIsFetching] = useState(false);
   const user = useSelector((state: RootState) => state.user);
   const { isContactAdded } = useContacts();
   const router = useRouter();

   useEffect(() => {
      const fetchGifts = async () => {
         setIsFetching(true);
         try {
            const apiGifts = await request<GetAllGiftsResponse>('/api/gifts', 'GET');
            const normalizedGifts = normalizeGifts(apiGifts.gifts);
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

   const normalizeGifts = (apiGifts: Gift[], force: boolean = false): Record<string, GiftAsset> => {
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

            const giftAsset: GiftAsset = {
               amountCents: gift.amount,
               name: gift.name,
               selectedSrc: gift.imageUrlSelected,
               unselectedSrc: gift.imageUrlUnselected,
               description: gift.description,
               creatorPubkey: gift.creatorPubkey,
               fee: gift.fee ? gift.fee : undefined,
            };
            acc[gift.name] = giftAsset;
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

   const fetchGift = async (identifier: string): Promise<GiftAsset | null> => {
      const apiGift = await request<GetGiftResponse>(`/api/gifts/${identifier}`, 'GET');
      if (!apiGift) {
         return null;
      }
      return normalizeGifts([apiGift], true)[identifier];
   };

   const getGiftByIdentifier = (identifier: string): GiftAsset | undefined => {
      return giftAssets[identifier];
   };

   const getGiftFromToken = async (token: string | Token): Promise<GiftAsset | null> => {
      const txid =
         typeof token === 'string' ? computeTxId(token) : computeTxId(getEncodedToken(token));
      console.log('txid', txid);
      const { gift } = await request<{ gift: string }>(`/api/token/${txid}`, 'GET');
      console.log('gift', gift);
      if (!gift) return null;
      const localGift = getGiftByIdentifier(gift) || null;
      if (localGift) {
         return localGift;
      } else {
         return await fetchGift(gift);
      }
   };

   const value: GiftContextType = {
      giftAssets,
      getGiftByIdentifier,
      getGiftFromToken,
      loadingGifts: isFetching,
      fetchGift,
      loadUserCustomGifts,
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
