import { getCashuWallet } from '~/lib/cashu';
import { ExchangeRateService } from '~/lib/exchange-rate';
import type {
  LNURLError,
  LNURLPayParams,
  LNURLPayResult,
  LNURLVerifyResult,
  LUD21Currency,
} from '~/lib/lnurl/types';
import { type Currency, Money } from '~/lib/money';
import { AccountRepository } from '../accounts/account-repository';
import type { AgicashDb } from '../agicash-db/database';
import type { CashuCryptography } from '../shared/cashu';
import { getDefaultUnit } from '../shared/currencies';
import { UserRepository } from '../user/user-repository';
import { CashuReceiveQuoteRepository } from './cashu-receive-quote-repository';
import { CashuReceiveQuoteService } from './cashu-receive-quote-service';

const fakeCryptography: CashuCryptography = {
  encrypt: async <T = unknown>(data: T): Promise<string> =>
    JSON.stringify(data),
  decrypt: async <T = unknown>(data: string): Promise<T> => data as T,
  getSeed: (): Promise<Uint8Array> => {
    throw new Error('getSeed is not supported in this context');
  },
  getXpub: (): Promise<string> => {
    throw new Error('getXpub is not supported in this context');
  },
  getPrivateKey: (): Promise<string> => {
    throw new Error('getPrivateKey is not supported in this context');
  },
};

export class LightningAddressService {
  private baseUrl: string;
  private userRepository: UserRepository;
  private cashuReceiveQuoteRepository: CashuReceiveQuoteRepository;
  private accountRepository: AccountRepository;
  private minSendable: Money<'BTC'>;
  private maxSendable: Money<'BTC'>;
  private cryptography: CashuCryptography = fakeCryptography;

  private exchangeRateService: ExchangeRateService;

  constructor(request: Request, db: AgicashDb) {
    this.exchangeRateService = new ExchangeRateService();
    this.userRepository = new UserRepository(db, this.cryptography);
    this.cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
      db,
      this.cryptography,
    );
    this.accountRepository = new AccountRepository(db, this.cryptography);
    this.baseUrl = new URL(request.url).origin;
    this.minSendable = new Money({
      amount: 1,
      currency: 'BTC',
      unit: 'sat',
    });
    this.maxSendable = new Money({
      amount: 1_000_000,
      currency: 'BTC',
      unit: 'sat',
    });
  }

  /**
   * Returns the LNURL-p params for the given username or
   * returns an error if the user is not found.
   */
  async handleLud16Request(
    username: string,
  ): Promise<LNURLPayParams | LNURLError> {
    try {
      const user = await this.userRepository.getByUsername(username);

      if (!user) {
        return {
          status: 'ERROR',
          reason: 'not found',
        };
      }

      const defaultAccount = await this.userRepository.getDefaultAccount(
        user.id,
      );
      const defaultAccountCurrency = defaultAccount.currency;

      const callback = `${this.baseUrl}/api/lnurlp/callback/${user.id}`;
      const address = `${user.username}@${new URL(this.baseUrl).host}`;
      const metadata = JSON.stringify([
        ['text/plain', `Pay to ${address}`],
        ['text/identifier', address],
      ]);

      // LUD-21: Include currency object for local unit of account
      // We ask for this spcific currency, but we are okay with falling back to BTC.
      const lud21Currency = await this.getLUD21Currency(defaultAccountCurrency);

      return {
        callback,
        maxSendable: this.maxSendable.toNumber('msat'),
        minSendable: this.minSendable.toNumber('msat'),
        metadata,
        tag: 'payRequest',
        currency: lud21Currency,
      };
    } catch (error) {
      console.error('Error processing LNURL-pay request', { cause: error });
      return {
        status: 'ERROR',
        reason: 'Internal server error',
      };
    }
  }

  /**
   * Creates a new cashu receive quote for the given user and amount.
   * @returns the bolt11 invoice from the receive quote and the verify callback url.
   */
  async handleLnurlpCallback({
    userId,
    amount,
    requestSupportsLUD21,
  }: {
    /**
     * The user id of the user to create a receive quote for.
     */
    userId: string;
    /**
     * The amount to receive. This amount can be in any supported currency.
     */
    amount: Money<Currency>;
    /**
     * Whether the request supports LUD-21. If the currency search parameter is present, this is true.
     */
    requestSupportsLUD21: boolean;
  }): Promise<LNURLPayResult | LNURLError> {
    try {
      const user = await this.userRepository.get(userId);

      if (!user) {
        return {
          status: 'ERROR',
          reason: 'not found',
        };
      }

      const defaultAccount =
        await this.userRepository.getDefaultAccount(userId);

      let targetCurrency: Currency;
      let amountToReceive: Money<Currency>;

      if (requestSupportsLUD21) {
        targetCurrency = defaultAccount.currency;

        // Validate the request currency
        if (!this.isSupportedCurrency(amount.currency)) {
          return {
            status: 'ERROR',
            reason: 'Unsupported currency',
          };
        }

        // Convert amount from request currency to target currency
        if (amount.currency === targetCurrency) {
          amountToReceive = amount;
        } else {
          const rate = await this.exchangeRateService.getRate(
            `${amount.currency}-${targetCurrency}`,
          );
          amountToReceive = amount.convert(targetCurrency, rate);
        }
      } else {
        // Legacy flow: fallback to BTC because requesting client might validate invoice amounts
        targetCurrency = 'BTC';
        amountToReceive = amount;
      }

      let amountInBtc: Money<'BTC'>;
      if (amountToReceive.currency === 'BTC') {
        amountInBtc = amountToReceive as Money<'BTC'>;
      } else {
        const btcRate = await this.exchangeRateService.getRate(
          `${amountToReceive.currency}-BTC`,
        );
        amountInBtc = amountToReceive.convert('BTC', btcRate);
      }

      if (
        amountInBtc.lessThan(this.minSendable) ||
        amountInBtc.greaterThan(this.maxSendable)
      ) {
        const unit = getDefaultUnit(amountInBtc.currency);
        return {
          status: 'ERROR',
          reason: `Amount out of range. Min: ${this.minSendable.toLocaleString({ unit })}, Max: ${this.maxSendable.toLocaleString({ unit })}.`,
        };
      }

      // Get account for target currency
      const account =
        defaultAccount.currency === targetCurrency
          ? defaultAccount
          : await this.userRepository.getDefaultAccount(userId, targetCurrency);

      if (account.type !== 'cashu') {
        throw new Error(`Account type not supported. Got ${account.type}`);
      }

      const cashuReceiveQuoteService = new CashuReceiveQuoteService(
        {
          ...this.cryptography,
          getXpub: () => Promise.resolve(user.cashuLockingXpub),
        },
        this.cashuReceiveQuoteRepository,
      );

      const quote = await cashuReceiveQuoteService.createLightningQuote({
        userId,
        account,
        amount: amountToReceive,
      });

      return {
        pr: quote.paymentRequest,
        verify: `${this.baseUrl}/api/lnurlp/verify/${quote.id}`,
        routes: [],
      };
    } catch (error) {
      console.error('Error processing LNURL-pay callback', { cause: error });
      return {
        status: 'ERROR',
        reason: 'Internal server error',
      };
    }
  }

  /**
   * Checks if the payment of a cashu receive quote has been settled.
   * @param receiveQuoteId the id of the cashu receive quote to check.
   * @return the lnurl-verify result
   */
  async handleLnurlpVerify(
    receiveQuoteId: string,
  ): Promise<LNURLVerifyResult | LNURLError> {
    try {
      const quote = await this.cashuReceiveQuoteRepository.get(receiveQuoteId);

      if (!quote) {
        return {
          status: 'ERROR',
          reason: 'Not found',
        };
      }

      const account = await this.accountRepository.get(quote.accountId);
      if (account.type !== 'cashu') {
        throw new Error(`Account type not supported. Got ${account.type}`);
      }

      const wallet = getCashuWallet(account.mintUrl);
      const quoteState = await wallet.checkMintQuote(quote.quoteId);

      if (quoteState.state === 'PAID') {
        return {
          status: 'OK',
          settled: true,
          preimage: '',
          pr: quote.paymentRequest,
        };
      }

      return {
        status: 'OK',
        settled: false,
        preimage: null,
        pr: quote.paymentRequest,
      };
    } catch (error) {
      console.error('Error processing LNURL-pay verify', { cause: error });
      return {
        status: 'ERROR',
        reason: 'Internal server error',
      };
    }
  }

  isSupportedCurrency(currency: string): currency is Currency {
    return ['BTC', 'USD'].includes(currency);
  }

  /**
   * Get LUD-21 currency object for the user's default account currency
   */
  private async getLUD21Currency(
    defaultAccountCurrency: Currency,
  ): Promise<LUD21Currency> {
    const currencyNames = {
      BTC: 'Bitcoin',
      USD: 'US Dollar',
    };

    const currencySymbols = {
      BTC: '₿',
      USD: '$',
    };

    if (defaultAccountCurrency === 'BTC') {
      return {
        code: 'BTC',
        name: currencyNames.BTC,
        symbol: currencySymbols.BTC,
        minSendable: this.minSendable.toNumber('msat'),
        maxSendable: this.maxSendable.toNumber('msat'),
        multiplier: 1, // 1 msat per msat
      };
    }
    // For USD, calculate multiplier based on BTC-USD rate
    const btcUsdRate = await this.exchangeRateService.getRate('BTC-USD');
    const multiplier = Math.round(10 ** 11 / Number(btcUsdRate)); // millisats per USD cent

    const minSendableUsd = this.minSendable.convert('USD', btcUsdRate);
    const maxSendableUsd = this.maxSendable.convert('USD', btcUsdRate);

    return {
      code: 'USD',
      name: currencyNames.USD,
      symbol: currencySymbols.USD,
      minSendable: minSendableUsd.toNumber('cent'),
      maxSendable: maxSendableUsd.toNumber('cent'),
      multiplier,
    };
  }
}
