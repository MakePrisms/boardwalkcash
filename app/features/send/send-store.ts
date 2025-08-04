import { create } from 'zustand';
import type { Account, CashuAccount } from '~/features/accounts/account';
import { type DecodedBolt11, parseBolt11Invoice } from '~/lib/bolt11';
import { parseCashuPaymentRequest } from '~/lib/cashu';
import {
  buildLightningAddressFormatValidator,
  isValidLightningAddress,
} from '~/lib/lnurl';
import { type Currency, Money } from '~/lib/money';
import type { AccountsCache } from '../accounts/account-hooks';
import { type Contact, isContact } from '../contacts/contact';
import { DomainError } from '../shared/error';
import type { CashuLightningQuote } from './cashu-send-quote-service';
import type { CashuSwapQuote } from './cashu-send-swap-service';

const validateLightningAddressFormat = buildLightningAddressFormatValidator({
  message: 'Invalid lightning address',
  allowLocalhost: import.meta.env.MODE === 'development',
});

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

type SendType =
  | 'CASHU_TOKEN'
  | 'BOLT11_INVOICE'
  | 'LN_ADDRESS'
  | 'AGICASH_CONTACT';

type DecodedDestination = {
  type: SendType;
  amount?: Money | null;
};

export type SendDestination = {
  type: SendType;
  bolt11: string;
} & (
  | {
      type: 'BOLT11_INVOICE';
    }
  | {
      type: 'LN_ADDRESS';
      lightningAddress: string;
    }
  | {
      type: 'AGICASH_CONTACT';
      contact: Contact;
    }
);

type State = {
  status: 'idle' | 'quoting';
  /**
   * Amount to send.
   */
  amount: Money | null;
  /**
   * ID of the account to send from.
   */
  accountId: string;
  /**
   * Type of the send.
   */
  sendType: SendType;
  /**
   * Temporary storage for original destination input before we get the bolt11
   */
  destinationInput?: string | Contact;
  /**
   * The destination of the send.
   */
  destination: SendDestination | null;
} & (
  | {
      sendType: 'CASHU_TOKEN';
      /**
       * Quote to generate a cashu token to send.
       */
      quote: CashuSwapQuote | null;
      destination: null;
    }
  | {
      sendType: 'BOLT11_INVOICE' | 'LN_ADDRESS' | 'AGICASH_CONTACT';
      /**
       * Quote to make a lightning payment.
       */
      quote: CashuLightningQuote | null;
    }
);

type Actions = {
  selectSourceAccount: (account: Account) => void;
  getSourceAccount: () => Account;
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
};

export type SendState = State & Actions;

type CreateSendStoreProps = {
  initialAccount: Account;
  accountsCache: AccountsCache;
  getLatestAccount: (accountId: string) => Promise<Account>;
  getInvoiceFromLud16: (params: {
    lud16: string;
    amount: Money<'BTC'>;
  }) => Promise<string>;
  createCashuSendQuote: (params: {
    account: CashuAccount;
    paymentRequest: string;
    amount: Money<Currency>;
  }) => Promise<CashuLightningQuote>;
  getCashuSendSwapQuote: (params: {
    accountId: string;
    amount: Money<Currency>;
    senderPaysFee?: boolean;
  }) => Promise<CashuSwapQuote>;
};

export const createSendStore = ({
  initialAccount,
  accountsCache,
  getLatestAccount,
  getInvoiceFromLud16,
  createCashuSendQuote,
  getCashuSendSwapQuote,
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
      accountId: initialAccount.id,
      sendType: 'CASHU_TOKEN',
      destination: null,
      quote: null,

      selectSourceAccount: (account) => set({ accountId: account.id }),

      getSourceAccount: () => {
        const accountId = get().accountId;
        const account = accountsCache.get(accountId);
        if (!account) {
          throw new Error(`Account with id ${accountId} not found`);
        }
        return account;
      },

      clearDestination: () =>
        set({
          sendType: 'CASHU_TOKEN',
          destinationInput: undefined,
        }),

      selectDestination: async (destination) => {
        if (isContact(destination)) {
          set({
            sendType: 'AGICASH_CONTACT',
            destinationInput: destination,
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
            destinationInput: destination,
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
            destinationInput: destination,
            destination: {
              bolt11: destination,
              type: 'BOLT11_INVOICE',
            },
          });

          return {
            success: true,
            data: { type: 'BOLT11_INVOICE', amount: result.amount },
          };
        }

        const cashuRequestParseResult = parseCashuPaymentRequest(destination);
        if (cashuRequestParseResult.valid) {
          return {
            success: false,
            error: 'Cashu payment requests are not supported',
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
        const { sendType, accountId } = get();
        const account = await getLatestAccount(accountId);
        const amountToSend = pickAmountByCurrency(amounts, account.currency);

        set({ status: 'quoting', amount: amountToSend });

        if (sendType === 'CASHU_TOKEN') {
          if (account.type !== 'cashu') {
            throw new Error('Cannot send cashu token from non-cashu account');
          }

          try {
            const quote = await getCashuSendSwapQuote({
              accountId: account.id,
              amount: amountToSend,
            });

            set({ quote });
          } catch (error) {
            console.error(error);
            set({ status: 'idle' });
            return { success: false, error };
          }
        }

        if (['LN_ADDRESS', 'AGICASH_CONTACT'].includes(sendType)) {
          const destinationInput = getOrThrow('destinationInput');
          const lnAddress = isContact(destinationInput)
            ? destinationInput.lud16
            : destinationInput;

          const amountInBtc = pickAmountByCurrency(amounts, 'BTC');
          try {
            const bolt11 = await getInvoiceFromLud16({
              lud16: lnAddress,
              amount: amountInBtc,
            });

            if (sendType === 'LN_ADDRESS') {
              set({
                destination: {
                  bolt11,
                  type: 'LN_ADDRESS',
                  lightningAddress: lnAddress,
                },
              });
            } else if (sendType === 'AGICASH_CONTACT') {
              set({
                destination: {
                  bolt11,
                  type: 'AGICASH_CONTACT',
                  contact: destinationInput as Contact,
                },
              });
            }
          } catch (error) {
            console.error(error);
            set({ status: 'idle' });
            return { success: false, error };
          }
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
              paymentRequest: destination.bolt11,
              amount: amountToSend,
            });
            set({ quote });
          } catch (error) {
            if (!(error instanceof DomainError)) {
              console.error(error);
            }
            set({ status: 'idle' });
            return { success: false, error };
          }
        }

        set({ status: 'idle' });
        return { success: true };
      },
    };
  });
};

export type SendStore = ReturnType<typeof createSendStore>;
