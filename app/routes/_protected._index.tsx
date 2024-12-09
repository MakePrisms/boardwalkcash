import { useOpenSecret } from '@opensecret/react';
import { Button } from '~/components/ui/button';
import { useTheme } from '~/features/theme';

export default function Index() {
  const os = useOpenSecret();
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();

  // Will remove this if later
  if (!os.auth.user) {
    throw new Error('Something is wrong');
  }

  return (
    <div>
      <h1>Welcome to Boardwalk!</h1>
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
    </div>
  );
}
