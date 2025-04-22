import { type Token, decodePaymentRequest } from '@cashu/cashu-ts';
import { create } from 'zustand';
import type { Account } from '~/features/accounts/account';
import { type DecodedBolt11, validateBolt11Invoice } from '~/lib/bolt11';
import { isCashuPaymentRequest } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import type { BtcUnit, UsdUnit } from '~/lib/money/types';

type PaymentRequestUnit = 'sat' | 'cent';

export type PaymentRequest = {
  type: 'bolt11' | 'cashu';
  raw: string;
  unit: PaymentRequestUnit;
};

const getAppCurrencyAndUnitFromCashuUnit = (
  unit: string,
):
  | { currency: 'BTC'; unit: Extract<BtcUnit, 'sat'> }
  | { currency: 'USD'; unit: Extract<UsdUnit, 'cent'> } => {
  switch (unit) {
    case 'sat':
      return { currency: 'BTC', unit: 'sat' };
    case 'cent':
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
      unit: PaymentRequestUnit;
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

const validateCashuRequest = (raw: string): ValidateResult => {
  const decoded = decodePaymentRequest(raw);
  if (!decoded.unit) {
    // QUESTION: by spec, unit is optional, but if we don't enforce it then we jsut have to assume sats. Should we enforce it?
    return {
      valid: false,
      error: 'Payment request is missing unit',
    };
  }

  const { currency, unit } = getAppCurrencyAndUnitFromCashuUnit(decoded.unit);

  return {
    valid: true,
    amount: decoded.amount
      ? new Money({
          amount: decoded.amount,
          currency,
          unit,
        })
      : null,
    unit,
    currency,
  };
};

export type SendState<T extends Currency = Currency> = {
  /** The account to send funds from */
  account: Account;
  /** The amount to send in the account's currency */
  amount: Money<T> | null;
  /**
   * The current payment request being processed.
   * If null it either means the user has not yet entered a payment request or we are sending and ecash token.
   */
  paymentRequest: PaymentRequest | null;
  /** The token being sent */
  token: Token | null;
  /** Set the token being sent */
  setToken: (token: Token | null) => void;
  /** Set the account to send funds from */
  setAccount: (account: Account) => void;
  /** Set the amount to send in the account's currency */
  setAmount: (amount: Money<T>) => void;
  /**
   * Set the payment request being processed.
   * This will validate the payment request and return an error instead of setting the payment request if it is invalid.
   */
  setPaymentRequest: (raw: string) => ValidateResult;
  /** Clear the payment request */
  clearPaymentRequest: () => void;
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
    setPaymentRequest: (raw) => {
      const validationResult = validateBolt11Invoice(raw);
      if (validationResult.valid) {
        const result = validateBolt11(validationResult.decoded);
        if (!result.valid) {
          return result;
        }
        set({ paymentRequest: { type: 'bolt11', raw, unit: result.unit } });
        return result;
      }

      if (isCashuPaymentRequest(raw)) {
        const result = validateCashuRequest(raw);
        if (!result.valid) {
          return result;
        }
        set({ paymentRequest: { type: 'cashu', raw, unit: result.unit } });
        return result;
      }

      return {
        valid: false,
        error:
          'Only Lightning invoices and Cashu payment requests are supported',
      };
    },
    clearPaymentRequest: () => set({ paymentRequest: null }),
  }));
};

export type SendStore = ReturnType<typeof createSendStore>;
