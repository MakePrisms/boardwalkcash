import { GiftAsset } from '@/types';

export const getRecipientPubkeyFromGift = (gift: GiftAsset) => {
   if (gift.splits && Array.isArray(gift.splits) && gift.splits?.length > 0) {
      if (gift.splits?.length > 1) {
         throw new Error('can only have one');
      }
      return gift.splits[0].recipient;
   }
};
