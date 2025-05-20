import type { PaymentRequest, Token } from '@cashu/cashu-ts';
import { create } from 'zustand';
import type { Account, CashuAccount } from '~/features/accounts/account';
import { type DecodedBolt11, parseBolt11Invoice } from '~/lib/bolt11';
import { parseCashuPaymentRequest } from '~/lib/cashu';
import {
  buildLightningAddressFormatValidator,
  isValidLightningAddress,
} from '~/lib/lnurl';
import { type Currency, Money } from '~/lib/money';
import type { BtcUnit, UsdUnit } from '~/lib/money/types';
import { type Contact, isContact } from '../contacts/contact';
import type { CashuLightningQuote } from './cashu-send-quote-service';

const validateLightningAddressFormat = buildLightningAddressFormatValidator({
  message: 'Invalid lightning address',
  allowLocalhost: import.meta.env.MODE === 'development',
});

const getAppCurrencyAndUnitFromCashuUnit = (
  unit: string,
):
  | { currency: 'BTC'; unit: Extract<BtcUnit, 'sat'> }
  | { currency: 'USD'; unit: Extract<UsdUnit, 'cent'> } => {
  switch (unit) {
    case 'sat':
      return { currency: 'BTC', unit: 'sat' };
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
  expiryUnixMs,
}: DecodedBolt11): ValidateResult => {
  if (network !== 'bitcoin') {
    return {
      valid: false,
      error: `Unsupported network: ${network}. Only Bitcoin mainnet is supported`,
    };
  }

  if (expiryUnixMs) {
    const expiresAt = new Date(expiryUnixMs);
    const now = new Date();
    if (expiresAt < now) {
      return {
        valid: false,
        error: 'Invoice expired',
      };
    }
  }

  if (!amountSat) {
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

const validateCashuRequest = (request: PaymentRequest): ValidateResult => {
  if (!request.unit) {
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

const pickAmountByCurrency = <T extends Currency>(
  amounts: Money[],
  currency: T,
): Money<T> => {
  const amount = amounts.find((amount) => amount.currency === currency);
  if (!amount) {
    throw new Error(`Amount in currency (${currency}) was not found`);
  }
  return amount as unknown as Money<T>;
};

export type SendType =
  | 'CASHU_TOKEN'
  | 'CASHU_PAYMENT_REQUEST'
  | 'BOLT11_INVOICE'
  | 'LN_ADDRESS'
  | 'AGICASH_CONTACT';

export type DecodedDestination = {
  type: SendType;
  amount?: Money | null;
};

type State = {
  status: 'idle' | 'quoting';
  amount: Money | null;
  account: Account;
  sendType: SendType;
  destination: string | null;
  displayDestination: string | null;
  cashuToken: Token | null;
  quote: CashuLightningQuote | null;
};

type Actions = {
  selectSourceAccount: (account: Account) => void;
  selectDestination: (
    destination: string | Contact,
  ) => Promise<
    | { success: true; data: DecodedDestination }
    | { success: false; error: string }
  >;
  clearDestination: () => void;
  getQuote: (
    amount: Money<Currency>,
    convertedAmount: Money<Currency> | undefined,
  ) => Promise<{ success: true } | { success: false; error: unknown }>;
  setCashuToken: (token: Token) => void;
};

export type SendState = State & Actions;

type CreateSendStoreProps = {
  initialAccount: Account;
  getInvoiceFromLud16: (params: {
    lud16: string;
    amount: Money<'BTC'>;
  }) => Promise<string>;
  createCashuSendQuote: (params: {
    account: CashuAccount;
    paymentRequest: string;
    amount: Money<Currency>;
  }) => Promise<CashuLightningQuote>;
};

export const createSendStore = ({
  initialAccount,
  getInvoiceFromLud16,
  createCashuSendQuote,
}: CreateSendStoreProps) => {
  return create<SendState>()((set, get) => {
    const getOrThrow = <T extends keyof SendState>(
      key: T,
      errorMessage?: string,
    ): NonNullable<SendState[T]> => {
      const value = get()[key];
      if (!value) {
        throw new Error(errorMessage ?? `${key} is required`);
      }
      return value;
    };

    return {
      status: 'idle',
      amount: null,
      account: initialAccount,
      sendType: 'CASHU_TOKEN',
      destination: null,
      displayDestination: null,
      quote: null,
      cashuToken: null,

      selectSourceAccount: (account) => set({ account }),

      clearDestination: () =>
        set({
          destination: null,
          displayDestination: null,
          sendType: 'CASHU_TOKEN',
        }),

      selectDestination: async (destination) => {
        if (isContact(destination)) {
          set({
            sendType: 'AGICASH_CONTACT',
            destination: destination.lud16,
            displayDestination: destination.username,
          });

          return {
            success: true,
            data: { type: 'AGICASH_CONTACT' },
          };
        }

        const isLnAddressFormat = validateLightningAddressFormat(destination);
        if (isLnAddressFormat === true) {
          const isValidLnAddress = await isValidLightningAddress(destination);
          if (!isValidLnAddress) {
            return {
              success: false,
              error: 'Invalid lightning address',
            };
          }

          set({
            sendType: 'LN_ADDRESS',
            destination: destination,
            displayDestination: destination,
          });

          return {
            success: true,
            data: { type: 'LN_ADDRESS' },
          };
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
            destination: destination,
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
            destination: destination,
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

      getQuote: async (amount, convertedAmount) => {
        const amounts = [amount, convertedAmount].filter((x) => !!x);
        const { sendType, account } = get();
        const amountToSend = pickAmountByCurrency(amounts, account.currency);

        set({ status: 'quoting', amount: amountToSend });

        if (['LN_ADDRESS', 'AGICASH_CONTACT'].includes(sendType)) {
          const destination = getOrThrow('destination');

          const amountInBtc = pickAmountByCurrency(amounts, 'BTC');
          const bolt11 = await getInvoiceFromLud16({
            lud16: destination,
            amount: amountInBtc,
          });

          set({ destination: bolt11 });
        }

        if (
          ['BOLT11_INVOICE', 'LN_ADDRESS', 'AGICASH_CONTACT'].includes(sendType)
        ) {
          if (account.type !== 'cashu') {
            throw new Error('Not implemented. Account is not a cashu account');
          }
          const destination = getOrThrow('destination');

          try {
            const quote = await createCashuSendQuote({
              account,
              paymentRequest: destination,
              amount: amountToSend,
            });
            set({ quote });
          } catch (error) {
            console.error(error);
            set({ status: 'idle' });
            return { success: false, error };
          }
        }

        set({ amount: amountToSend, status: 'idle' });
        return { success: true };
      },

      setCashuToken: (token) => {
        const { sendType } = get();
        if (sendType !== 'CASHU_TOKEN') {
          throw new Error(
            'Cannot set cashu token if send type is not CASHU_TOKEN',
          );
        }
        set({ cashuToken: token });
      },
    };
  });
};

export type SendStore = ReturnType<typeof createSendStore>;
