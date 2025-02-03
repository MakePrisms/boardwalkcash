import { type Token, getDecodedToken, getEncodedToken } from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import { MoneyDisplay } from '~/components/money-display';
import {
  Page,
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { toast } from '~/hooks/use-toast';
import { getP2PKPubkeyFromProofs } from '~/lib/cashu';
import { checkTokenForSpentProofs } from '~/lib/cashu/token';
import { accounts } from '~/routes/_protected._index';
import { LoadingScreen } from '../loading/LoadingScreen';
import { isTestMint, tokenToMoney } from './util';

const _usdToken = getDecodedToken(
  'cashuBo2FteCJodHRwczovL25vZmVlcy50ZXN0bnV0LmNhc2h1LnNwYWNlYXVjdXNkYXSBomFpSAC6Lj5XeeA1YXCDo2FhAWFzeEA0NzY2Mjk3OGQwMjhkNGUyYmUxNDU5ZTA1MDNmYjk4OTQwY2U2M2I1Nzk5NjQ0MTc2ODVjNWI0YWUwN2E3NDc3YWNYIQMCPpbL-MZ8lLjXCdr2S5l5cGqkurNXhP_wvTjQLOkJX6NhYQRhc3hAZjk1OGEyYWU1OTlhYmM1MzhjZGFiMWZiNDExMDA1ZmI5OTRkNzMzNTM1OWY4MWYwYjI5MmQ4OTEwNTFlZjdjY2FjWCECjHg661umQy37Zu2XbanzO4QfnkEm3OPyR-JALqoLNP-jYWEYQGFzeEAzZjkwOTFiZTY0ZjkxMTQ5NGVmNmQyZTRkNjQ4OTcxYjVkZTRkNzUyOThjMWU3NTcxYTNkYThmZDA1YmZlZGY2YWNYIQJ7Rq4bNDAM03ESzER3bMLaBkoRsL-eLdzBT0GMH9MahQ',
);
const _satToken = getDecodedToken(
  'cashuBo2FteCJodHRwczovL25vZmVlcy50ZXN0bnV0LmNhc2h1LnNwYWNlYXVjc2F0YXSBomFpSAC0zSfYhhpEYXCDo2FhAWFzeEBlMzQ4MGNhM2QyYjNiNTNlMjBlOTM2MTQ4ODE2ZGQzMDc1OWZmNDUyOTUzZWY2MWY3NjE5YjQ2NTE1NDY3N2I3YWNYIQJMm-dNzbYEk6xwxYlqrLJhOvO9Wgo-U2pzkbGYqAWO8KNhYQRhc3hAMzZiYmMzZjg2MjQ3ZjFkYmM3MTNiMDZmMDU5ZTNhYjdmOWQ4MDkyMjllYzk3MjU0MTRiYzc3ZjgzYzdhNzcwNGFjWCEC1QiNidRTGnHKuwhDyvzOGsePkV0yCbPN6fhvsKYBoJCjYWEYQGFzeEAxNTdmYmMyZTkyY2U0MjJjNWY5OWU1YzI4NDZkMGIwOWNjMWMzZDAwYzcwNDU5ODM4MzZiYTk0MGQ2ZTMzYmNmYWNYIQP2c4jWzvXNiQYgox0lmw2BTe3AoyadVfZ4RPjGOD1Q6g',
);
const _spentToken = getDecodedToken(
  'cashuBo2FteCJodHRwczovL25vZmVlcy50ZXN0bnV0LmNhc2h1LnNwYWNlYXVjdXNkYXSBomFpSAC6Lj5XeeA1YXCBo2FhAmFzeEA2YTEyN2FlMjAyYzk1ZjRjZDRlYThiYTM0ZTczNjE4ZjU3OGFkZjUxNmRiNTUzYTkwMmE4NTg5Nzk2YmRjMzczYWNYIQLOZ_XFRb1H4f8cmgL1efQNucZ_iWQlq6m5UWV_vzNC8A',
);

const defaultAccount = accounts[0];
const defaultFiatCurrency = 'USD';

type Props = {
  token: Token;
};

export default function ReceiveToken({ token }: Props) {
  const tokenMoney = tokenToMoney(token);
  const {
    rate,
    isLoading: isExchangeRateLoading,
    error: exchangeRateError,
  } = useExchangeRate(`${tokenMoney.currency}-${defaultFiatCurrency}`);
  const user = {
    pubkey: '038127ae202c95f4cd4ea8ba34e73618f578adf516db553a902a8589796bdc373',
  };
  const tokenIsFiat = tokenMoney.currency !== 'BTC';

  const { data: isSpent, isLoading: isSpentLoading } = useQuery({
    queryKey: ['token-spent', token],
    queryFn: async () => {
      const spent = await checkTokenForSpentProofs(token);
      if (spent) {
        toast({
          title: 'ecash already spent',
          variant: 'destructive',
        });
      }
      return spent;
    },
  });

  let p2pkPubkey: string | null = null;
  try {
    p2pkPubkey = getP2PKPubkeyFromProofs(token.proofs);
  } catch {
    // QUESTION: this is thrown when the token has multiple pubkeys, or any proof is not a p2pk
    // How should we handle those cases?
    p2pkPubkey = null;
  }

  // should show converted amount if:
  // 1. if token currency is BTC
  // 2. if token currency is different from users default currency
  // should not show if:
  // 1. token currency is the same as users default currency (unless token is BTC)
  const shouldShowConvertedAmount =
    !tokenIsFiat || tokenMoney.currency !== defaultFiatCurrency;

  // to be claimable, the token must not be spent
  // and either the token is not p2pk or the p2pk is the user's pubkey
  // NOTE: cashu pubkeys are 33-bytes. Need to see whether OS uses compressed pubkeys or x-only
  const canClaim =
    !isSpent && (p2pkPubkey === null || p2pkPubkey === user.pubkey);

  // TODO: should chceck mint against user's accounts
  // will be undefined if the user is not initialized (ie. clicked a token link, but not logged in)
  const isMintTrusted: boolean | undefined = true;

  // claim to source mint claims the token to the mint that issued the token
  // should show claim to source mint if
  // 1. the token is not spent
  // 2. canClaim is true
  // 3. default account is not the source mint
  const shouldShowClaimToSourceMint = !isSpent && canClaim;

  // disable claim to default account if:
  // 1. cannot claim
  // 2. token is from a test mint that is not the default account's mint
  const disableClaimToDefault =
    !canClaim ||
    (isTestMint(token.mint) &&
      defaultAccount.type === 'cashu' &&
      defaultAccount.mintUrl !== token.mint);

  const handleClaimToDefaultAccount = () => {
    console.log('claim');
  };

  const handleClaimToSourceMint = () => {
    console.log('claim to source mint');
  };

  return (
    <Page>
      <PageHeader>
        <PageBackButton
          to="/receive"
          transition="slideRight"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center">
        {isSpentLoading ? (
          <LoadingScreen />
        ) : (
          <>
            <div className="flex flex-col items-center">
              <MoneyDisplay
                money={tokenMoney}
                unit={tokenMoney.currency === 'BTC' ? 'sat' : 'usd'}
              />
              {shouldShowConvertedAmount && (
                <div className="flex flex-col items-center gap-2">
                  {isExchangeRateLoading ? (
                    <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                  ) : exchangeRateError ? null : (
                    <MoneyDisplay
                      money={tokenMoney.convert(defaultFiatCurrency, rate)}
                      unit={'usd'}
                      variant="secondary"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              {token.mint}{' '}
              {isMintTrusted !== undefined ? (isMintTrusted ? '✅' : '❌') : ''}
            </div>

            {isSpent && (
              <div>
                <p className="text-destructive">Token is spent</p>
              </div>
            )}

            {canClaim && (
              <Button
                disabled={disableClaimToDefault}
                onClick={handleClaimToDefaultAccount}
              >
                Claim
              </Button>
            )}

            {shouldShowClaimToSourceMint && (
              <Button onClick={handleClaimToSourceMint}>
                Claim to source mint
              </Button>
            )}

            <div className="break-all text-gray-500 text-xs">
              {getEncodedToken(token)}
            </div>
          </>
        )}
      </PageContent>
    </Page>
  );
}
