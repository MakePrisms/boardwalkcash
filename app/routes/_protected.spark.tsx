import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { useInterval } from 'usehooks-ts';
import { WalletSDK } from 'wallet-sdk';
import {
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { Money } from '~/lib/money';
import { useOpenSecret } from '@opensecret/react';

const network: 'MAINNET' | 'REGTEST' = 'MAINNET';

// TODO: research derivation paths and pick one that makes sense
// maybe spark has already defined one?
const sparkDerivationPath = "m/75'/0'/0'/0/0";

export default function Index() {
  const { getPrivateKeyBytes } = useOpenSecret();
  const [wallet, setWallet] = useState<WalletSDK | null>(null);
  const [balance, setBalance] = useState<Money<'BTC'> | null>(null);
  const [lnInvoiceData, setLnInvoiceData] = useState<{
    id: string;
    encoded_invoice: string;
    fees_on_receive_sats: bigint | number;
    paid: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const balance = await wallet.getBtcBalance();
      console.log('fetched balance after wallted created: ', balance);
      setBalance(
        new Money({
          amount: balance.toString(),
          currency: 'BTC',
          unit: 'sat',
        }),
      );
    } catch (e) {
      console.error('Failed to fetch balance', e);
    }
  }, [wallet]);

  useEffect(() => {
    const setupWallet = async () => {
      try {
        const wallet = new WalletSDK(network);
        const { private_key } = await getPrivateKeyBytes(sparkDerivationPath);
        await wallet.createSparkWalletWithSeedKey(private_key);
        setWallet(wallet);
      } catch (e) {
        console.error('Failed to setup Spark wallet', e);
      }
    };
    setupWallet();
  }, [getPrivateKeyBytes]);

  useInterval(
    () => {
      if (!wallet || !lnInvoiceData) return;
      const refreshInvoice = async () => {
        const resp = await wallet.queryLightningInvoice(lnInvoiceData.id);
        setLnInvoiceData(resp);
      };
      refreshInvoice();
    },
    lnInvoiceData && !lnInvoiceData.paid ? 3000 : null,
  );

  useInterval(
    () => {
      if (!wallet) return;
      const refreshState = async () => {
        await wallet.syncWallet();
        await fetchBalance();
      };
      refreshState();
    },
    wallet ? 3000 : null,
  );

  return (
    <Page>
      <PageHeader>
        <PageHeaderTitle>Spark</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        {!wallet && <div>Loading wallet...</div>}
        {wallet && (
          <>
            <div>
              <h1>My Balance</h1>
              <div>
                BTC: {balance ? balance.toLocaleString() : 'Loading...'}
              </div>
              {/* <div>Sats: {balance.toLocaleString({ unit: 'sat' })}</div> */}
            </div>
            <div className="mt-6">
              <h1>Receive via Lightning</h1>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amount = BigInt(formData.get('amount') as string);
                  console.log(amount);
                  try {
                    const resp = await wallet.createLightningInvoice(
                      amount,
                      3600,
                    );
                    setLnInvoiceData(resp);
                  } catch (err) {
                    const errMessage =
                      err instanceof Error ? err.message : 'Unknown error';
                    setError(`Failed to generate invoice: ${errMessage}`);
                    console.error('Failed to generate invoice:', err);
                  }
                }}
              >
                <div className="mb-2">
                  <label htmlFor="amount">Amount</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    placeholder="Amount in sats"
                    className="rounded border bg-background p-2 text-foreground"
                    required
                  />
                </div>
                <Button type="submit">Generate ln invoice</Button>
                <Button
                  className="ml-4"
                  type="button"
                  onClick={() => {
                    (
                      document.getElementById('amount') as HTMLInputElement
                    ).value = '';
                    setLnInvoiceData(null);
                    setError(null);
                  }}
                >
                  Clear
                </Button>
              </form>
              {error && <div>{error}</div>}
              {lnInvoiceData && (
                <div>
                  <h2>Invoice to pay</h2>
                  <div>Id: {lnInvoiceData.id}</div>
                  <div>
                    Fees on receive (in sats):{' '}
                    {lnInvoiceData.fees_on_receive_sats.toString()}
                  </div>
                  <div>Paid: {lnInvoiceData.paid ? 'Yes' : 'No'}</div>
                  <div>Invoice to share: {lnInvoiceData.encoded_invoice}</div>
                  <QRCodeSVG
                    className="mt-4"
                    value={`lightning:${lnInvoiceData.encoded_invoice}`}
                    size={250}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </PageContent>
    </Page>
  );
}
