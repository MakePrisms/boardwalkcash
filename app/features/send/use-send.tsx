import {
  CashuMint,
  CashuWallet,
  type MeltQuoteResponse,
} from '@cashu/cashu-ts';
import { useMutation } from '@tanstack/react-query';
import type { Account } from '~/features/accounts/account';
import { Money } from '~/lib/money';
import { getDefaultUnit } from '../shared/currencies';

const createSendQuoteForBolt11 = async (
  bolt11: string,
  sendFrom: Account & { type: 'cashu' },
): Promise<{ fee?: Money; meltQuote?: MeltQuoteResponse }> => {
  const wallet = new CashuWallet(new CashuMint(sendFrom.mintUrl));
  try {
    const meltQuote = await wallet.createMeltQuote(bolt11);
    return {
      fee: new Money({
        amount: meltQuote.fee_reserve,
        currency: sendFrom.currency,
        unit: getDefaultUnit(sendFrom.currency),
      }),
      meltQuote,
    };
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to create send quote for bolt11');
  }
};

type Props = {
  bolt11: string;
  sendFrom: Account;
};

export const useSend = ({ bolt11, sendFrom }: Props) => {
  const {
    mutate: createSendQuote,
    data: sendQuote,
    error: _sendQuoteError,
  } = useMutation({
    mutationFn: async () => {
      if (sendFrom.type !== 'cashu') {
        throw new Error('Only sending from Cashu is supported');
      }
      return createSendQuoteForBolt11(bolt11, sendFrom);
    },
  });

  return {
    createSendQuote,
    sendQuote,
  };
};
