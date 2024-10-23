import { GiftFee } from '@/types';
import { Gift } from '@prisma/client';

export const getRecipientPubkeyFromGift = (gift: Gift) => {
   if (gift.splits && Array.isArray(gift.splits) && gift.splits?.length > 0) {
      if (gift.splits?.length > 1) {
         throw new Error('can only have one');
      }
      return (gift.splits as Array<GiftFee>)[0].recipient;
   }
};
