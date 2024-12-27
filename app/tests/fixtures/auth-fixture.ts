import type { UserResponse } from '@opensecret/react';
import { test as base } from '@playwright/test';
import type { OpenSecretFixture } from '~/tests/fixtures/open-secret/fixture';
import {
  createAccessToken,
  createRefreshToken,
} from '~/tests/mocks/open-secret';

type AuthFixture = {
  /**
   * User to log in. When not provided the test will be started without logged-in user
   */
  user?: UserResponse['user'] | null;
  /**
   * Auto executed fixture which sets up local storage and mocks for authentication.
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: ts complains if we use undefined instead of void here
  performAuth: void;
};

export const test = base.extend<AuthFixture & OpenSecretFixture>({
  user: [null, { option: true }],
  performAuth: [
    async ({ page, user, openSecretApiMock }, use) => {
      if (user) {
        const now = Date.now() / 1000;
        const accessToken = createAccessToken(now, user.id);
        const refreshToken = createRefreshToken(now, user.id);

        await openSecretApiMock.setupEncrypted<UserResponse>({
          url: '/protected/user',
          responseData: { user },
        });

        await page.goto('/');

        await page.evaluate(
          async (tokens) => {
            localStorage.setItem('access_token', tokens.accessToken);
            localStorage.setItem('refresh_token', tokens.refreshToken);
          },
          { accessToken, refreshToken },
        );
      }

      await use();
    },
    { auto: true },
  ],
});
