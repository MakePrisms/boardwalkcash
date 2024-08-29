import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { request } from '@/utils/appApiRequests';
import { computeTxId } from '@/utils/cashu';
import { GetAllGiftsResponse, GetGiftResponse, GiftAsset } from '@/types';
import { Gift } from '@prisma/client';
import { Token, getEncodedToken } from '@cashu/cashu-ts';

interface GiftContextType {
   giftAssets: Record<string, GiftAsset>;
   getGiftByIdentifier: (identifier: string) => GiftAsset | undefined;
   getGiftFromToken: (token: string | Token) => Promise<GiftAsset | null>;
   loadingGifts: boolean;
   fetchGiftById: (id: number) => Promise<GiftAsset | null>;
}

const GiftContext = createContext<GiftContextType | undefined>(undefined);

interface GiftProviderProps {
   children: ReactNode;
}

export const GiftProvider: React.FC<GiftProviderProps> = ({ children }) => {
   const [giftAssets, setGiftAssets] = useState<Record<string, GiftAsset>>({});
   const [isFetching, setIsFetching] = useState(false);

   useEffect(() => {
      const fetchGifts = async () => {
         setIsFetching(true);
         try {
            const apiGifts = await request<GetAllGiftsResponse>('/api/gifts', 'GET');
            const normalizedGifts = normalizeGifts(apiGifts.gifts);
            setGiftAssets(normalizedGifts);
            await preloadAndCacheImages(
               Object.values(normalizedGifts).map(g => g.imageUrlSelected),
            );
            await preloadAndCacheImages(
               Object.values(normalizedGifts).map(g => g.imageUrlUnselected),
            );
         } catch (error) {
            console.error('Failed to fetch gifts:', error);
         }
         setIsFetching(false);
      };

      fetchGifts();
   }, []);

   const normalizeGifts = (apiGifts: Gift[]): Record<string, GiftAsset> => {
      return apiGifts.reduce(
         (acc, gift) => {
            acc[gift.name] = gift;
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

   const fetchGiftById = async (id: number): Promise<GiftAsset | null> => {
      return await request<GetGiftResponse>(`/api/gifts/${id}`, 'GET');
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
      return getGiftByIdentifier(gift) || null;
   };

   const value: GiftContextType = {
      giftAssets,
      getGiftByIdentifier,
      getGiftFromToken,
      loadingGifts: isFetching,
      fetchGiftById,
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
