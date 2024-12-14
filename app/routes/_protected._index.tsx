import { useOpenSecret } from '@opensecret/react';
import { NavLink } from '@remix-run/react';
import { Cog } from 'lucide-react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Page, PageHeader } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useTheme } from '~/features/theme';
import { toast } from '~/hooks/use-toast';
import { ViewTransition } from '~/lib/transitions';
import { buildEmailValidator } from '~/lib/validation';

type FormValues = { email: string; password: string; confirmPassword: string };

const validateEmail = buildEmailValidator('Invalid email');

export default function Index() {
  const os = useOpenSecret();
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();

  // Will remove this if later
  if (!os.auth.user) {
    throw new Error('Something is wrong');
  }

  const isGuestAccount = !os.auth.user.user.email;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await os.convertGuestToUserAccount(data.email, data.password);
      localStorage.removeItem('guestAccount.id');
      localStorage.removeItem('guestAccount.password');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error! Failed to convert account',
        description: 'Please try again later or contact support',
      });
    }
  };

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center justify-end">
          <ViewTransition
            to="/settings"
            transition="slideLeft"
            applyTo="newView"
          >
            <Cog />
          </ViewTransition>
        </div>
      </PageHeader>

      <h1>Welcome to Boardwalk!</h1>
      <ViewTransition
        as={NavLink}
        to="/settings"
        transition="slideLeft"
        applyTo="newView"
      >
        <Button>As NavLink</Button>
      </ViewTransition>
      <br />
      <br />
      <ViewTransition to="/settings" transition="slideLeft" applyTo="bothViews">
        <Button>Slide both views</Button>
      </ViewTransition>
      {isGuestAccount && <div>Guest account</div>}
      <div>id: {os.auth.user.user.id}</div>
      <div>email: {os.auth.user.user.email}</div>
      <div>name: {os.auth.user.user.name}</div>
      <div>
        email verified: {os.auth.user.user.email_verified ? 'true' : 'false'}
      </div>
      <div>login method: {os.auth.user.user.login_method}</div>
      <div>created at: {os.auth.user.user.created_at}</div>
      <div>updated at: {os.auth.user.user.updated_at}</div>
      <Button variant="default" onClick={os.signOut} className="mt-2">
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
      {isGuestAccount && (
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
