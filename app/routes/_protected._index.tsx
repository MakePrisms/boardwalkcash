import { useOpenSecret } from '@opensecret/react';
import type { MetaFunction } from '@vercel/remix';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { useTheme } from '~/features/theme';

export const meta: MetaFunction = () => {
  return [
    { title: 'Boardwalk' },
    { name: 'description', content: 'Welcome to Boardwalk!' },
  ];
};

export default function Index() {
  const os = useOpenSecret();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();

  if (os.auth.loading) {
    return <div>Loading...</div>;
  }

  if (os.auth.user) {
    return (
      <div>
        <h1>Welcome to Boardwalk!</h1>
        <div>id: {os.auth.user.user.id}</div>
        <div>email: {os.auth.user.user.email}</div>
        <div>name: {os.auth.user.user.name}</div>
        <div>email verified: {os.auth.user.user.email_verified}</div>
        <div>login method: {os.auth.user.user.login_method}</div>
        <div>created at: {os.auth.user.user.created_at}</div>
        <div>updated at: {os.auth.user.user.updated_at}</div>
        <Button variant="default" onClick={() => os.signOut()}>
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome to Boardwalk!</h1>
      <form className="flex flex-row gap-2">
        <input
          name="email"
          type="email"
          placeholder="Email/Id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          name="name"
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="button"
          variant="default"
          onClick={() => {
            if (email && password) {
              os.signIn(email, password);
            }
          }}
        >
          Log in
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => {
            if (email && password) {
              os.signInGuest(email, password);
            }
          }}
        >
          Log in Guest
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={async () => {
            if (password) {
              const res = await os.signUpGuest(password, '');
              console.log('signup guest response: ', res);
              await os.signInGuest(res.id, password);
            }
          }}
        >
          Signup Guest
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={async () => {
            if (email && password) {
              await os.signUp(email, password, '', name);
              await os.signIn(email, password);
            }
          }}
        >
          Signup
        </Button>
      </form>
      <div className="flex flex-row gap-2">
        <Button onClick={() => setTheme(theme === 'usd' ? 'btc' : 'usd')}>
          {theme}
        </Button>
        <Button
          onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
        >
          {effectiveColorMode}
        </Button>
      </div>
    </div>
  );
}
