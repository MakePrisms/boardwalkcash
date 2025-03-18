import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInterval } from 'usehooks-ts';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account';
import { useSparkAccount } from '../accounts/account-hooks';
import { useSparkBalance } from '../balance/use-balance';

// TODO: network should be defined on the account? Or should we even have option for different networks?
// REGTEST is useful for testing, but maybe shouldn't exist in production?
const sparkNetwork = 'REGTEST';

/**
 * Hook to detect when a payment has been received by checking for balance increases
 */
export type UseDetectPaymentReturn = {
  isPaid: boolean;
  resetPaymentDetection: () => void;
};

// a hacky hook to detect when a payment has been received by checking for balance increases
// spark needs to update their sdk to make this better
export const useDetectPayment = (
  expectedAmount?: Money<'BTC'>,
): UseDetectPaymentReturn => {
  const sparkWallet = useSparkAccount(sparkNetwork);
  const [isPaid, setIsPaid] = useState(false);
  // This initial balance is used to check if a payment has been received
  // spark-sdk v0.0.16 doesn't have a way to check specific invoices
  const [initialBalance, setInitialBalance] = useState<bigint>();
  const { refetch: refetchSparkBalance } = useSparkBalance();

  // Set initial balance when the hook mounts
  useEffect(() => {
    if (!sparkWallet) return;

    const fetchInitialBalance = async () => {
      try {
        const balanceData = await sparkWallet.getBalance();
        setInitialBalance(balanceData.balance);
      } catch (err) {
        console.error('Failed to fetch initial balance:', err);
      }
    };

    fetchInitialBalance();
  }, [sparkWallet]);

  // Check for balance updates to detect payments
  useInterval(
    () => {
      const checkBalance = async () => {
        if (isPaid) return;
        if (!sparkWallet) return;
        try {
          // Force refetch to claim the payment
          const balanceData = await sparkWallet.getBalance(true);

          // If balance has increased, mark as paid
          if (
            initialBalance !== undefined &&
            balanceData.balance > initialBalance
          ) {
            // If an expected amount was provided, verify that the balance increased by at least that amount
            if (
              !expectedAmount ||
              balanceData.balance - initialBalance >=
                BigInt(expectedAmount.toNumber('sat'))
            ) {
              setIsPaid(true);
              // Refresh the balance for the useBalance hook
              // QUESTION: is this the best way to make our global balance update?
              refetchSparkBalance();
            }
          }
        } catch (err) {
          console.error('Failed to check balance:', err);
        }
      };

      checkBalance();
    },
    isPaid ? null : 2500,
  ); // Stop checking once paid

  const resetPaymentDetection = () => {
    setIsPaid(false);
    if (sparkWallet) {
      sparkWallet.getBalance().then((balanceData) => {
        setInitialBalance(balanceData.balance);
      });
    }
  };

  return {
    isPaid,
    resetPaymentDetection,
  };
};

export type UseReceiveSparkReturn = {
  invoice?: string;
  isLoading: boolean;
  fetchError?: string;
  createInvoice: () => void;
};

// TODO: this should be a hook specific for invoices, but we need a better way to check if an invoice has been paid
// This hook is used for creating invoices and checking if they have been paid.
export const useReceiveSpark = ({
  account: _,
  amount,
  memo,
  isVisible = false,
}: {
  account: Account;
  amount: Money<'BTC'>;
  memo: string;
  isVisible?: boolean;
}): UseReceiveSparkReturn => {
  const sparkWallet = useSparkAccount(sparkNetwork);

  // QUESTION: is useMutation the right tool for the job here?
  const {
    data: invoice,
    status,
    error,
    mutate,
  } = useMutation<string>({
    mutationFn: () =>
      sparkWallet.createLightningInvoice({
        amountSats: amount.toNumber('sat'),
        memo,
      }),
  });

  // Create invoice when the component becomes visible
  useEffect(() => {
    if (isVisible && !invoice && sparkWallet) {
      mutate();
    }
  }, [isVisible, invoice, mutate, sparkWallet]);

  return {
    invoice,
    isLoading: status === 'pending',
    fetchError: error?.message,
    createInvoice: mutate,
  };
};

/**
 * A Spark address is a static public address that can be used to receive payments within Spark.
 * This hook returns the Spark address and a loading state.
 */
export const useSparkAddress = () => {
  const sparkWallet = useSparkAccount(sparkNetwork);

  const { data: sparkAddress, isLoading } = useQuery({
    queryKey: ['sparkAddress'],
    queryFn: () => sparkWallet.getSparkAddress(),
  });

  return { sparkAddress, isLoading };
};
