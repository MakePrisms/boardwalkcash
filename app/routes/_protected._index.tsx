import { NavLink, useOutletContext } from '@remix-run/react';
import { Cog } from 'lucide-react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { PageContent, PageHeader, PageHeaderTitle } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useTheme } from '~/features/theme';
import { useAuthActions } from '~/features/user/auth';
import { useUserStore } from '~/features/user/user-provider';
import { toast } from '~/hooks/use-toast';
import { type ExchangeRates, convertToUnit } from '~/lib/exchange-rate';
import { formatUnit } from '~/lib/formatting';
import { LinkWithViewTransition } from '~/lib/transitions';
import { buildEmailValidator } from '~/lib/validation';

type FormValues = { email: string; password: string; confirmPassword: string };

const validateEmail = buildEmailValidator('Invalid email');

export default function Index() {
  const { signOut } = useAuthActions();
  const user = useUserStore((s) => s.user);
  const upgradeGuestToFullAccount = useUserStore(
    (s) => s.upgradeGuestToFullAccount,
  );
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();
  const { rates } = useOutletContext<{ rates: ExchangeRates }>();

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
    <>
      <PageHeader>
        <PageHeaderTitle>
          <div>
            {/* dollars per bitcoin */}
            {formatUnit(rates.BTCUSD, 'usd')}/BTC;
          </div>
          <div>
            {/* sats per dollar */}
            {formatUnit(convertToUnit(1, 'usd', 'sat', rates), 'sat')}/$
          </div>
        </PageHeaderTitle>
        <LinkWithViewTransition
          to="/settings"
          transition="slideLeft"
          applyTo="newView"
        >
          <Cog />
        </LinkWithViewTransition>
      </PageHeader>

      <PageContent>
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
            onClick={() =>
              setColorMode(colorMode === 'dark' ? 'light' : 'dark')
            }
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
      </PageContent>
    </>
  );
}
