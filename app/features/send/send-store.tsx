import type {
  PaymentRequest as CashuPaymentRequest,
  Token,
} from '@cashu/cashu-ts';
import { create } from 'zustand';
import type { Account } from '~/features/accounts/account';
import { type DecodedBolt11, parseBolt11Invoice } from '~/lib/bolt11';
import { parseCashuPaymentRequest } from '~/lib/cashu';
import { getLNURLPayParams, isLNURLError } from '~/lib/lnurl';
import {} from '~/lib/lnurl/types';
import { type Currency, Money } from '~/lib/money';
import type { BtcUnit, UsdUnit } from '~/lib/money/types';
import { buildEmailValidator } from '~/lib/validation';

const getAppCurrencyAndUnitFromCashuUnit = (
  unit: string,
):
  | { currency: 'BTC'; unit: Extract<BtcUnit, 'sat'> }
  | { currency: 'USD'; unit: Extract<UsdUnit, 'cent'> } => {
  switch (unit) {
    case 'sat':
      return { currency: 'BTC', unit: 'sat' };
    // TODO: Damien doesn't cashu call this unit usd?
    case 'usd':
      return { currency: 'USD', unit: 'cent' };
  }
  throw new Error(`Invalid Cashu unit ${unit}`);
};

type ValidateResult =
  | {
      valid: false;
      error: string;
    }
  | {
      valid: true;
      amount: Money<Currency> | null;
      currency: Currency;
      unit: 'sat' | 'cent';
    };

const validateBolt11 = ({
  network,
  amountSat,
}: DecodedBolt11): ValidateResult => {
  if (network !== 'bitcoin') {
    return {
      valid: false,
      error: `Unsupported network: ${network}. Only Bitcoin mainnet is supported`,
    };
  }

  if (!amountSat) {
    // csahu does not support amountless invoices
    return {
      valid: false,
      error: 'Amount is required for Lightning invoices',
    };
  }

  return {
    valid: true,
    amount: new Money({
      amount: amountSat,
      currency: 'BTC' as Currency,
      unit: 'sat',
    }),
    unit: 'sat',
    currency: 'BTC',
  };
};

const validateCashuRequest = (request: CashuPaymentRequest): ValidateResult => {
  if (!request.unit) {
    // QUESTION: by spec, unit is optional, but if we don't enforce it then we jsut have to assume sats. Should we enforce it?
    return {
      valid: false,
      error: 'Payment request is missing unit',
    };
  }

  const { currency, unit } = getAppCurrencyAndUnitFromCashuUnit(request.unit);

  return {
    valid: true,
    amount: request.amount
      ? new Money({
          amount: request.amount,
          currency,
          unit,
        })
      : null,
    unit,
    currency,
  };
};

type SendType =
  | 'CASHU_TOKEN'
  | 'CASHU_PAYMENT_REQUEST'
  | 'BOLT11_INVOICE'
  | 'LN_ADDRESS';

type DecodedDestination = {
  type: SendType;
  amount?: Money | null;
};

export type SendState = {
  status: 'idle' | 'confirming';
  amount: Money | null;
  account: Account;
  sendType: SendType | null;
  destination: string | null;
  displayDestination: string | null;
  selectSourceAccount: (account: Account) => void;
  selectDestination: (
    destination: string,
  ) => Promise<
    | { success: true; data: DecodedDestination }
    | { success: false; error: string }
  >;
  clearDestination: () => void;
  confirm: (amount: Money, convertedAmount: Money) => Promise<void>;
  cashuToken: Token | null;
  setCashuToken: (token: Token) => void;
};

const isValidLightningAddress = async (address: string) => {
  try {
    const params = await getLNURLPayParams(address);
    return !isLNURLError(params);
  } catch {
    return false;
  }
};

const validateLightningAddressFormat = buildEmailValidator(
  'Invalid lightning address',
);

const pickAmountCurrencyByAccount = (amounts: Money[], account: Account) => {
  const amount = amounts.find((amount) => amount.currency === account.currency);
  if (!amount) {
    throw new Error(
      `Amount that matches the currency of the account (${account.currency}) was not found`,
    );
  }
  return amount;
};

export const createSendStore = ({
  initialAccount,
  getInvoiceFromLud16,
}: {
  initialAccount: Account;
  getInvoiceFromLud16: (params: {
    lud16: string;
    amount: Money<'BTC'>;
  }) => Promise<string>;
}) => {
  return create<SendState>()((set, get) => ({
    status: 'idle',
    amount: null,
    account: initialAccount,
    sendType: 'CASHU_TOKEN',
    destination: null,
    displayDestination: null,
    cashuToken: null,
    selectSourceAccount(account: Account) {
      set({ account });
    },
    async selectDestination(destination: string) {
      const isLnAddressFormat = validateLightningAddressFormat(destination);
      if (isLnAddressFormat === true) {
        const isValidLnAddress = await isValidLightningAddress(destination);
        if (!isValidLnAddress) {
          return { success: false, error: 'Invalid lightning address' };
        }

        set({ sendType: 'LN_ADDRESS', displayDestination: destination });
        return { success: true, data: { type: 'LN_ADDRESS' } };
      }

      const bolt11ParseResult = parseBolt11Invoice(destination);
      if (bolt11ParseResult.valid) {
        const invoice = bolt11ParseResult.decoded;
        const result = validateBolt11(invoice);
        if (!result.valid) {
          return { success: false, error: result.error };
        }

        set({
          sendType: 'BOLT11_INVOICE',
          destination,
          displayDestination: `${destination.slice(0, 6)}...${destination.slice(-4)}`,
        });
        return {
          success: true,
          data: { type: 'BOLT11_INVOICE', amount: result.amount },
        };
      }

      const cashuRequestParseResult = parseCashuPaymentRequest(destination);
      if (cashuRequestParseResult.valid) {
        const result = validateCashuRequest(cashuRequestParseResult.decoded);
        if (!result.valid) {
          return { success: false, error: result.error };
        }

        set({
          sendType: 'CASHU_PAYMENT_REQUEST',
          destination,
          displayDestination: `${destination.slice(0, 6)}...${destination.slice(-4)}`,
        });
        return {
          success: true,
          data: { type: 'CASHU_PAYMENT_REQUEST', amount: result.amount },
        };
      }

      return {
        success: false,
        error:
          'Invalid destination. Must be lightning address, bolt11 invoice or cashu payment request',
      };
    },
    clearDestination: () =>
      set({
        destination: null,
        displayDestination: null,
        sendType: 'CASHU_TOKEN',
      }),
    async confirm(amount: Money, convertedAmount: Money) {
      set({ status: 'confirming', amount });
      const { account, sendType, displayDestination } = get();

      if (sendType === 'LN_ADDRESS') {
        if (!displayDestination) {
          throw new Error('Destination is required');
        }
        const bitcoinInputValue = (
          amount.currency === 'BTC' ? amount : convertedAmount
        ) as Money<'BTC'>;
        const bolt11 = await getInvoiceFromLud16({
          lud16: displayDestination,
          amount: bitcoinInputValue,
        });
        set({ destination: bolt11 });
      }

      const amountToSend = pickAmountCurrencyByAccount(
        [amount, convertedAmount],
        account,
      );
      set({ amount: amountToSend, status: 'idle' });
    },
    setCashuToken: (token: Token) => {
      if (get().sendType !== 'CASHU_TOKEN') {
        throw new Error(
          'Cannot set cashu token if send type is not CASHU_TOKEN',
        );
      }
      set({ cashuToken: token });
    },
  }));
};

export type SendStore = ReturnType<typeof createSendStore>;
