import { type Token, decodePaymentRequest } from '@cashu/cashu-ts';
import { create } from 'zustand';
import type { Account } from '~/features/accounts/account';
import { decodeBolt11, isBolt11Invoice } from '~/lib/bolt11';
import { isCashuPaymentRequest } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import type { BtcUnit, CurrencyUnit, UsdUnit } from '~/lib/money/types';
import { getCurrencyFromCashuUnit } from '../shared/cashu';

export type PaymentRequestUnit<T extends Currency = Currency> = T extends 'BTC'
  ? Extract<BtcUnit, 'sat'>
  : T extends 'USD'
    ? Extract<UsdUnit, 'cent'>
    : never;

export type PaymentRequest = {
  type: 'bolt11' | 'cashu';
  raw: string;
  unit: PaymentRequestUnit;
};

export type SendState<T extends Currency = Currency> = {
  /** The account to send funds from */
  account: Account;
  /** The amount to send in the account's currency */
  amount: Money<T> | null;
  /** The current payment request being processed */
  paymentRequest: PaymentRequest | null;
  /** Whether the user is in the process of sending a token */
  token: Token | null;
  /** Set the token being sent */
  setToken: (token: Token | null) => void;
  /** Set the account to send funds from */
  setAccount: (account: Account) => void;
  /** Set the amount to send in the account's currency */
  setAmount: (amount: Money<T>) => void;
  /** Set the payment request being processed */
  setPaymentRequest: (raw: string | null) => {
    error: string | null;
    type: 'bolt11' | 'cashu' | null;
    decoded: {
      amount: Money<Currency> | null;
      unit: PaymentRequestUnit;
    } | null;
  };
};

export const createSendStore = ({
  initialAccount,
  initialAmount,
}: {
  initialAccount: Account;
  initialAmount: Money | null;
}) => {
  return create<SendState>((set, get) => ({
    account: initialAccount,
    amount: initialAmount,
    paymentRequest: null,
    token: null,
    setAccount: (account) => set({ account, amount: null }),
    setAmount: (amount) => {
      const { account } = get();
      if (amount.currency !== account.currency) {
        throw new Error(
          `Amount currency (${amount.currency}) must match account currency (${account.currency})`,
        );
      }
      set({ amount });
    },
    setToken: (token) => set({ token }),
    setPaymentRequest: (raw: string | null) => {
      if (!raw) {
        set({ paymentRequest: null });
        return {
          error: null,
          type: null,
          decoded: null,
        } satisfies DecodedResult;
      }

      type DecodedResult = {
        error: string | null;
        type: 'bolt11' | 'cashu' | null;
        decoded: {
          amount: Money<Currency> | null;
          unit: PaymentRequestUnit;
        } | null;
      };

      if (isBolt11Invoice(raw)) {
        const { network, amountSat } = decodeBolt11(raw);

        if (network !== 'bitcoin') {
          return {
            error: `Unsupported network: ${network}. Only Bitcoin mainnet is supported`,
            type: 'bolt11',
            decoded: null,
          } satisfies DecodedResult;
        }

        if (!amountSat) {
          return {
            error: 'Amount is required for Lightning invoices',
            type: 'bolt11',
            decoded: null,
          } satisfies DecodedResult;
        }

        const result: DecodedResult = {
          error: null,
          type: 'bolt11',
          decoded: {
            amount: new Money({
              amount: amountSat,
              currency: 'BTC',
              unit: 'sat',
            }) as Money<Currency>,
            unit: 'sat',
          },
        };

        set({ paymentRequest: { type: 'bolt11', raw, unit: 'sat' } });
        return result;
      }

      if (isCashuPaymentRequest(raw)) {
        const decoded = decodePaymentRequest(raw);
        if (decoded.unit && !['sat', 'usd'].includes(decoded.unit)) {
          return {
            error: `Unsupported unit: ${decoded.unit}. Only sat and usd are supported`,
            type: 'cashu',
            decoded: null,
          } satisfies DecodedResult;
        }

        // we default to sat if the unit is not set in the payment request
        // because that's the most common unit
        // QUESTION: should we even allow requests without a unit?
        const decodedUnit =
          !decoded.unit || !['sat', 'usd'].includes(decoded.unit)
            ? ('sat' as const)
            : decoded.unit;

        // Convert usd to cent for internal use
        const unit =
          decodedUnit === 'usd'
            ? ('cent' as const)
            : (decodedUnit as PaymentRequestUnit);
        console.log('unit', unit);
        const currency = getCurrencyFromCashuUnit(unit as CurrencyUnit);
        console.log('currency', currency);
        const result: DecodedResult = {
          error: null,
          type: 'cashu',
          decoded: {
            amount: decoded.amount
              ? (new Money({
                  amount: decoded.amount,
                  currency,
                  unit,
                }) as Money<Currency>)
              : null,
            unit,
          },
        };

        set({ paymentRequest: { type: 'cashu', raw, unit } });
        return result;
      }

      return {
        error:
          'Only Lightning invoices and Cashu payment requests are supported',
        type: null,
        decoded: null,
      } satisfies DecodedResult;
    },
  }));
};

export type SendStore = ReturnType<typeof createSendStore>;
