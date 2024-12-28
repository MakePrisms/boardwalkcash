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
  user: UserResponse['user'] | null;
  /**
   * Controls if initial navigation to '/' should be performed. Default value is true. Ignored if user is not set.
   */
  performInitialNavigation: boolean;
  /**
   * Auto executed fixture which sets up local storage and mocks for authentication.
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: ts complains if we use undefined instead of void here
  performAuth: void;
};

declare global {
  interface Window {
    testInitScriptExecuted?: boolean;
  }
}

export const test = base.extend<AuthFixture & OpenSecretFixture>({
  user: [null, { option: true }],
  performInitialNavigation: [true, { option: true }],
  performAuth: [
    async (
      { page, baseURL, user, performInitialNavigation, openSecretApiMock },
      use,
    ) => {
      if (user) {
        const now = Date.now() / 1000;
        const accessToken = createAccessToken(now, user.id);
        const refreshToken = createRefreshToken(now, user.id);

        await openSecretApiMock.setupEncrypted<UserResponse>({
          url: '/protected/user',
          responseData: { user },
        });

        // Playwright doesn't have a way to set local storage before opening the app so we are using init script instead
        await page.addInitScript(
          ({ origin, accessToken, refreshToken }) => {
            if (
              window.location.origin === origin &&
              !window.testInitScriptExecuted
            ) {
              window.localStorage.setItem('access_token', accessToken);
              window.localStorage.setItem('refresh_token', refreshToken);
              window.testInitScriptExecuted = true;
            }
          },
          {
            origin: baseURL,
            accessToken,
            refreshToken,
          },
        );

        if (performInitialNavigation) {
          await page.goto('/');
        }
      }

      await use();
    },
    { auto: true },
  ],
});
