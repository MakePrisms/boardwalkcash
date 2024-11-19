import { giftMetadata } from './giftMetadata';

export const lookupGiftById = async (id: number) => {
   return giftMetadata.find(g => g.id === id);
};

export const getAllGifts = async () => {
   return giftMetadata;
};
