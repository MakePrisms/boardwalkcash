import * as crypto from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { decode } from '@stablelib/base64';
import type { Serializable } from 'playwright-core/types/structs';
import { openSecretEncryption } from '~/tests/fixtures/open-secret/encryption';
import { session } from '~/tests/mocks/open-secret';

type OpenSecretApiMockOptions<T extends Serializable> = {
  /**
   * Url of the endpoint. Can be full url or just a path
   */
  url: string;

  /**
   * Response headers. Header values will be converted to a string.
   */
  headers?: { [key: string]: string };

  /**
   * JSON response.
   */
  responseData: T;

  /**
   * Response status code, defaults to `200`.
   */
  status?: number;

  /**
   * How often a mock should be used. By default, it will be used every time.
   */
  times?: number;
};

type OpenSecretApiMock = {
  /**
   * Sets up open secret api mock with raw response data.
   */
  setup: <T = unknown>(options: OpenSecretApiMockOptions<T>) => Promise<void>;
  /**
   * Sets up open secret api mock with encrypted response data.
   */
  setupEncrypted: <T = unknown>(
    options: OpenSecretApiMockOptions<T>,
  ) => Promise<void>;
};

export type OpenSecretFixture = {
  /**
   * Open secret API mock. Use to mock the Open Secret responses.
   */
  openSecretApiMock: OpenSecretApiMock;
  /**
   * Presets Open Secret session before starting a test.
   * True by default. Set to false if you want to test "session handshake"
   */
  presetOpenSecretSession?: boolean;
};

type MockData = {
  config: OpenSecretApiMockOptions<unknown>;
  numOfInvocations: number;
};

const openSecretBaseUrl = 'https://preview-enclave.opensecret.cloud';

export const test = base.extend<OpenSecretFixture>({
  presetOpenSecretSession: [true, { option: true }],
  openSecretApiMock: async (
    { page, baseURL, presetOpenSecretSession },
    use,
  ) => {
    const mocksMap = new Map<string, MockData>();
    let openSecretRequestsCounter = 0;

    page.on('request', (request) => {
      if (request.url().startsWith(openSecretBaseUrl)) {
        openSecretRequestsCounter++;
      }
    });

    if (presetOpenSecretSession) {
      await page.addInitScript(
        async ({ baseURL, session }) => {
          if (
            window.location.origin === baseURL &&
            !window.sessionStorage.getItem('sessionId') &&
            !window.sessionStorage.getItem('sessionKey')
          ) {
            window.sessionStorage.setItem('sessionId', session.id);
            window.sessionStorage.setItem('sessionKey', session.key);
          }
        },
        { baseURL, session },
      );
    }

    const setup: OpenSecretApiMock['setup'] = async (options) => {
      const optionsStr = JSON.stringify(options);
      const key = crypto.createHash('sha256').update(optionsStr).digest('hex');
      const mockData = mocksMap.get(key);
      if (!mockData) {
        mocksMap.set(key, { config: options, numOfInvocations: 0 });
      }

      const { url, headers, responseData, status, times } = options;

      await page.route(
        getFullUrl(url),
        async (route) => {
          await route.fulfill({
            status,
            headers: headers,
            json: responseData,
          });
          const mockData = mocksMap.get(key);
          if (!mockData) {
            throw new Error('Mock data not found');
          }
          mocksMap.set(key, {
            ...mockData,
            numOfInvocations: mockData.numOfInvocations + 1,
          });
        },
        { times },
      );
    };

    const setupEncrypted: OpenSecretApiMock['setupEncrypted'] = async ({
      responseData,
      ...rest
    }) => {
      const dataString = JSON.stringify(responseData);
      const encryptedData: Serializable = openSecretEncryption.encryptMessage(
        decode(session.key),
        dataString,
      );
      await setup({
        ...rest,
        // Raw property is not present in the normal Open Secret response. We are just adding it here for easier
        // debugging in Playwright UI
        responseData: { encrypted: encryptedData, raw: responseData },
      });
    };

    await use({
      setup,
      setupEncrypted,
    });

    // Verify that each mock in the mocks map with times config set to non-zero value is invoked that exact number of times.
    // If the config for times is not defined, verify that it was called at least once
    let totalNumOfMockInvocations = 0;

    for (const [_, mockData] of mocksMap.entries()) {
      const { config, numOfInvocations } = mockData;
      totalNumOfMockInvocations += numOfInvocations;
      const { times } = config;

      if (times !== undefined) {
        // If `times` is set, verify it was invoked exactly that number of times
        expect(
          numOfInvocations,
          `Mock for URL ${config.url} was expected to be called ${times} times, but was called ${numOfInvocations} times.`,
        ).toEqual(times);
      } else {
        // If `times` is not set, verify it was invoked at least once
        expect(
          numOfInvocations,
          `Mock for URL ${config.url} was expected to be called at least once, but was never called.`,
        ).not.toBe(0);
      }
    }

    expect(
      openSecretRequestsCounter,
      'Non-mocked Open Secret requests were made.',
    ).toEqual(totalNumOfMockInvocations);
  },
});

const getFullUrl = (url: string) => {
  return url.startsWith(openSecretBaseUrl)
    ? url
    : `${openSecretBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
