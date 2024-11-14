import { giftMetadata } from './giftMetadata';

export const getGiftByName = async (name: string) => {
   return giftMetadata.find(g => g.name === name);
};

export const getAllGifts = async () => {
   return giftMetadata;
};
