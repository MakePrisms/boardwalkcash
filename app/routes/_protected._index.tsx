import { NavLink } from '@remix-run/react';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { Cog } from 'lucide-react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Page, PageHeader } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  type Account,
  AccountSelector,
} from '~/features/accounts/account-selector';
import { useTheme } from '~/features/theme';
import { useAuthActions } from '~/features/user/auth';
import { useUserStore } from '~/features/user/user-provider';
import { toast } from '~/hooks/use-toast';
import type { Rates } from '~/lib/exchange-rate';
import { exchangeRateService } from '~/lib/exchange-rate/exchange-rate-service';
import { Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';
import { buildEmailValidator } from '~/lib/validation';

type FormValues = { email: string; password: string; confirmPassword: string };

const validateEmail = buildEmailValidator('Invalid email');

const accounts: Account[] = [
  {
    id: '1',
    name: 'Testnut',
    currency: 'BTC',
    type: 'cashu',
    mintUrl: 'https://testnut.cashu.space',
    balance: new Big(0.00000054),
  },
  {
    id: '2',
    name: 'Start9',
    currency: 'BTC',
    type: 'nwc',
    nwcUrl: 'nwc connection string',
    balance: new Big(0.00000321),
  },
  {
    id: '3',
    name: 'Stablenut',
    currency: 'USD',
    type: 'cashu',
    mintUrl: 'https://stablenut.umint.cash.',
    balance: new Big(1.21),
  },
];

export default function Index() {
  const { signOut } = useAuthActions();
  const user = useUserStore((s) => s.user);
  const upgradeGuestToFullAccount = useUserStore(
    (s) => s.upgradeGuestToFullAccount,
  );
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();
  const { data: rates } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: ({ signal }) =>
      exchangeRateService.getRates({ tickers: ['BTC-USD'], signal }),
    // This is a workaround to make the type of the data not have | undefined.
    // In our case the initial data will be what was prefetched on the server but react query doesn't know that we are
    // doing prefetching there. I asked a question here to see if there is a better way
    // https://github.com/TanStack/query/discussions/1331#discussioncomment-11607342
    initialData: {} as Rates,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await upgradeGuestToFullAccount(data.email, data.password);
    } catch (e) {
      if (e instanceof Error && e.message === 'Email already registered') {
        toast({
          title: 'Email already taken',
          description:
            'Please try again with different email or login to your existing account',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error! Failed to convert account',
          description: 'Please try again later or contact support',
        });
      }
    }
  };

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center justify-start gap-2">
          {/* dollars per bitcoin */}
          {new Money({
            amount: rates['BTC-USD'],
            currency: 'USD',
          }).toLocaleString({ unit: 'usd' })}
        </div>
        <div className="flex items-center justify-end">
          <LinkWithViewTransition
            to="/settings"
            transition="slideLeft"
            applyTo="newView"
          >
            <Cog />
          </LinkWithViewTransition>
        </div>
      </PageHeader>

      <div>
        SATS per USD:{' '}
        {new Money({ amount: 1, currency: 'USD' })
          .convert('BTC', rates['USD-BTC'])
          .toLocaleString({ unit: 'sat' })}
        <br />
        $5 in SATS:{' '}
        {new Money({ amount: 5, currency: 'USD' })
          .convert('BTC', rates['USD-BTC'])
          .toLocaleString({ unit: 'sat' })}
        <br />
        5k sats in USD:{' '}
        {new Money({ amount: 5000, currency: 'BTC', unit: 'sat' })
          .convert('USD', rates['BTC-USD'])
          .toLocaleString()}
      </div>
      <br />

      <h1>Welcome to Boardwalk!</h1>
      <LinkWithViewTransition
        as={NavLink}
        to="/settings"
        transition="slideLeft"
        applyTo="newView"
      >
        <Button>As NavLink</Button>
      </LinkWithViewTransition>
      <br />
      <br />
      <AccountSelector accounts={accounts} onSelect={() => console.log} />
      <br />
      <br />
      <LinkWithViewTransition
        to="/settings"
        transition="slideLeft"
        applyTo="bothViews"
      >
        <Button>Slide both views</Button>
      </LinkWithViewTransition>
      {user.isGuest && <div>Guest account</div>}
      <div>id: {user.id}</div>
      <div>email: {!user.isGuest ? user.email : ''}</div>
      <div>email verified: {user.emailVerified ? 'true' : 'false'}</div>
      <div>login method: {user.loginMethod}</div>
      <div>created at: {user.createdAt}</div>
      <div>updated at: {user.updatedAt}</div>
      <Button variant="default" onClick={signOut} className="mt-2">
        Log out
      </Button>
      <div className="mt-2 flex flex-row gap-2">
        <p>Theme:</p>
        <Button onClick={() => setTheme(theme === 'usd' ? 'btc' : 'usd')}>
          {theme}
        </Button>
      </div>
      <div className="mt-2 flex flex-row gap-2">
        <p>Color mode:</p>
        <Button
          onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
        >
          {effectiveColorMode}
        </Button>
      </div>
      {user.isGuest && (
        <div className="mt-4 max-w-md">
          <h2>Upgrade to full account:</h2>
          <form
            className="mt-2 grid gap-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="satoshi@nakamoto.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                {...register('email', {
                  required: 'Email is required',
                  validate: validateEmail,
                })}
              />
              {errors.email && (
                <span role="alert" className="text-red-500 text-sm">
                  {errors.email.message}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must have at least 8 characters',
                  },
                })}
              />
              {errors.password && (
                <span role="alert" className="text-red-500 text-sm">
                  {errors.password.message}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                {...register('confirmPassword', {
                  required: 'Password confirmation is required',
                  validate: (value, values) =>
                    value === values.password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <span role="alert" className="text-red-500 text-sm">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Upgrade to full account
            </Button>
          </form>
        </div>
      )}
    </Page>
  );
}
