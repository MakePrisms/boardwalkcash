import type { UserResponse } from '@opensecret/react';
import { expect, test } from '~/tests/fixtures';

const user: UserResponse['user'] = {
  id: 'b15bcbfb-064c-4fd6-b10c-a05668e730d6',
  name: null,
  email: 'cosmo@kramer.com',
  email_verified: false,
  login_method: 'email',
  created_at: '2024-12-26T12:07:17.170640Z',
  updated_at: '2024-12-26T12:07:17.170640Z',
};

test.use({ user });

test('verify email by typing the code', async ({ page, openSecretApiMock }) => {
  const verificationCode = '03f1c2d1-0fb4-469b-93a9-c792ce6a0c61';

  await openSecretApiMock.setupEncrypted({
    url: `/verify-email/${verificationCode}`,
    responseData: {
      message: 'Email verified successfully',
    },
    times: 1,
  });

  await page.goto('/');

  await expect(
    page.getByText('Verify Your Email', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(
    page.getByRole('alert', { name: 'Code is required' }),
  ).toBeVisible();

  await page
    .getByRole('textbox', { name: 'Verification Code' })
    .fill(verificationCode);

  await expect(
    page.getByRole('alert', { name: 'Code is required' }),
  ).not.toBeVisible();

  await openSecretApiMock.setupEncrypted<UserResponse>({
    url: '/protected/user',
    responseData: {
      user: {
        ...user,
        email_verified: true,
        updated_at: '2024-12-26T12:08:17.170640Z',
      },
    },
  });

  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();

  // Assert that verified user cannot go back to verify email page
  await page.goto('/verify-email');

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();
});

test('verify email by opening the link', async ({
  page,
  openSecretApiMock,
}) => {
  const verificationCode = '6a5938cb-bd46-4773-8f8b-312409b80b62';

  await openSecretApiMock.setupEncrypted({
    url: `/verify-email/${verificationCode}`,
    responseData: {
      message: 'Email verified successfully',
    },
  });

  await page.goto(`/verify-email/${verificationCode}`);

  await expect(page.getByText('Verifying email...')).toBeVisible();

  await openSecretApiMock.setupEncrypted<UserResponse>({
    url: '/protected/user',
    responseData: {
      user: {
        ...user,
        email_verified: true,
        updated_at: '2024-12-26T12:08:17.170640Z',
      },
    },
  });

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();

  // Assert that verified user cannot go back to verify email page
  await page.goto(`/verify-email/${verificationCode}`);

  await expect(page.getByText('Welcome to Boardwalk!')).toBeVisible();
});
