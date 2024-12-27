import type { LoginResponse, UserResponse } from '@opensecret/react';
import {
  createAccessToken,
  createRefreshToken,
  fullUser,
  guestUser,
  session,
} from '~/tests/mocks/open-secret';
import { expect, test } from './fixtures';

test('login with email', async ({ page, openSecretApiMock }) => {
  const user = fullUser;
  const password = 'q1w2e3r4t5';
  const now = Date.now() / 1000;
  const accessToken = createAccessToken(now, user.id);
  const refreshToken = createRefreshToken(now, user.id);

  await openSecretApiMock.setupEncrypted<LoginResponse>({
    url: '/login',
    responseData: {
      id: user.id,
      email: user.email,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });

  await openSecretApiMock.setupEncrypted<UserResponse>({
    url: '/protected/user',
    responseData: { user },
  });

  await page.goto('/');

  await expect(page.getByText('Sign Up')).toBeVisible();

  await page.getByRole('link', { name: 'Log in' }).click();

  await page.getByRole('button', { name: 'Log in with Email' }).click();

  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();
});

test('login with email validation works', async ({
  page,
  openSecretApiMock,
}) => {
  const user = fullUser;
  const password = 'q1w2e3r4t5';
  const now = Date.now() / 1000;
  const accessToken = createAccessToken(now, user.id);
  const refreshToken = createRefreshToken(now, user.id);

  await openSecretApiMock.setupEncrypted<LoginResponse>({
    url: '/login',
    responseData: {
      id: user.id,
      email: user.email,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });

  await openSecretApiMock.setupEncrypted<UserResponse>({
    url: '/protected/user',
    responseData: { user },
  });

  await page.goto('/login');

  await page.getByRole('button', { name: 'Log in with Email' }).click();
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(
    page.getByRole('alert', { name: 'Email is required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Password is required' }),
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill('fdafdsa');
  await expect(
    page.getByRole('alert', { name: 'Invalid email' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Email is required' }),
  ).not.toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await expect(
    page.getByRole('alert', { name: 'Invalid email' }),
  ).not.toBeVisible();

  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(password);
  await expect(
    page.getByRole('alert', { name: 'Password is required' }),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();
});

test('signup as guest performs login as guest if the guest account was already created on the machine', async ({
  page,
  openSecretApiMock,
}) => {
  const user = guestUser;
  const now = Date.now() / 1000;
  const accessToken = createAccessToken(now, user.id);
  const refreshToken = createRefreshToken(now, user.id);
  const loginResponse: LoginResponse = {
    id: user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
  };

  await openSecretApiMock.setupEncrypted<LoginResponse>({
    url: '/register',
    responseData: loginResponse,
    times: 1,
  });

  await openSecretApiMock.setupEncrypted<UserResponse>({
    url: '/protected/user',
    responseData: { user },
    times: 2,
  });

  await openSecretApiMock.setupEncrypted<{ message: string }>({
    url: '/logout',
    responseData: { message: 'Logged out successfully' },
    times: 1,
  });

  await openSecretApiMock.setupEncrypted<LoginResponse>({
    url: '/login',
    responseData: loginResponse,
    times: 1,
  });

  await page.goto('/');

  await expect(page.getByText('Sign Up')).toBeVisible();

  await page.getByRole('button', { name: 'Create wallet as Guest' }).click();

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();

  await page.getByRole('button', { name: 'Log Out' }).click();

  // On logout Open Secret clears the session storage too so we have to set up session again
  await page.evaluate((session) => {
    window.sessionStorage.setItem('sessionId', session.id);
    window.sessionStorage.setItem('sessionKey', session.key);
  }, session);

  await expect(page.getByText('Sign Up')).toBeVisible();

  await page.getByRole('button', { name: 'Create wallet as Guest' }).click();

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();
});

test.describe('when already logged in', () => {
  test.use({ user: fullUser });

  test('cannot access login page', async ({ page }) => {
    await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();

    await page.goto('/login');

    await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();
  });
});

test('forgot password flow', async ({ page, openSecretApiMock }) => {
  await openSecretApiMock.setupEncrypted<{ message: string }>({
    url: '/password-reset/request',
    responseData: {
      message:
        'If an account with that email exists, we have sent a password reset link.',
    },
  });

  await openSecretApiMock.setupEncrypted<{ message: string }>({
    url: '/password-reset/confirm',
    responseData: {
      message:
        'Password reset successful. You can now log in with your new password.',
    },
  });

  await page.goto('/login');

  await page.getByRole('button', { name: 'Log in with Email' }).click();

  await page.getByRole('link', { name: 'Forgot your password?' }).click();

  await expect(page.getByText('Reset Password')).toBeVisible();

  await page.getByRole('button', { name: 'Request Password Reset' }).click();

  await expect(
    page.getByRole('alert', { name: 'Email is required' }),
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill('1');

  await expect(
    page.getByRole('alert', { name: 'Invalid email' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Email is required' }),
  ).not.toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill('cosmo@kramer.com');

  await expect(
    page.getByRole('alert', { name: 'Invalid email' }),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Request Password Reset' }).click();

  await expect(
    page.getByText('Enter the reset code and your new password'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Reset Password' }).click();

  await expect(
    page.getByRole('alert', { name: 'Code is required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Password is required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Password confirmation is required' }),
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Reset Code' }).fill('GP0KDF33');
  await expect(
    page.getByRole('alert', { name: 'Code is required' }),
  ).not.toBeVisible();

  await page
    .getByRole('textbox', { name: 'New Password', exact: true })
    .fill('1');
  await expect(
    page.getByRole('alert', {
      name: 'Password must have at least 8 characters',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Password is required' }),
  ).not.toBeVisible();

  await page
    .getByRole('textbox', { name: 'New Password', exact: true })
    .fill('q1w2e3r4t5');
  await expect(
    page.getByRole('alert', {
      name: 'Password must have at least 8 characters',
    }),
  ).not.toBeVisible();

  await page.getByRole('textbox', { name: 'Confirm New Password' }).fill('1');
  await expect(
    page.getByRole('alert', { name: 'Passwords do not match' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert', { name: 'Password confirmation is required' }),
  ).not.toBeVisible();

  await page
    .getByRole('textbox', { name: 'Confirm New Password' })
    .fill('q1w2e3r4t5');
  await expect(
    page.getByRole('alert', { name: 'Passwords do not match' }),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Reset Password' }).click();

  await expect(page.getByText('Login', { exact: true })).toBeVisible();
});
