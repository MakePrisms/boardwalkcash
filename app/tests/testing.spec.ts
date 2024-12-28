import type { UserResponse } from '@opensecret/react';
import { expect, test } from '~/tests/fixtures';
import { fullUser, guestUser } from '~/tests/mocks/open-secret';

test.use({ user: guestUser });

test('testing', async ({ page, openSecretApiMock }) => {
  const email = fullUser.email;
  const password = 'q1w2e3r4t5';

  await openSecretApiMock.setupEncrypted({
    url: '/protected/convert_guest',
    responseData: { message: 'something' },
    expectedRequestData: { email, password },
  });

  await expect(page.getByText('Welcome')).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(password);
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);

  await openSecretApiMock.setupEncrypted<UserResponse>({
    url: '/protected/user',
    responseData: { user: fullUser },
  });

  await page.getByRole('button', { name: 'Upgrade to full account' }).click();

  await expect(page.getByText('Upgrade to full account')).not.toBeVisible();
});
