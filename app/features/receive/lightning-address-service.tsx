import { getCashuWallet } from '~/lib/cashu';
import { ExchangeRateService } from '~/lib/exchange-rate/exchange-rate-service';
import type {
  LNURLError,
  LNURLPayParams,
  LNURLPayResult,
  LNURLVerifyResult,
} from '~/lib/lnurl/types';
import { Money } from '~/lib/money';
import { AccountRepository } from '../accounts/account-repository';
import type { AgicashDb } from '../agicash-db/database';
import type { CashuCryptography } from '../shared/cashu';
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
  /**
   * A client can flag that they will not validate the invoice amount.
   * This is useful for agicash <-> agicash payments so that the receiver can receive into their default currency
   * and we do not have to worry about exchange rate mismatches.
   */
  private bypassAmountValidation: boolean;

  constructor(
    request: Request,
    db: AgicashDb,
    options: {
      bypassAmountValidation?: boolean;
    } = {},
  ) {
    this.exchangeRateService = new ExchangeRateService();
    this.userRepository = new UserRepository(db, this.cryptography);
    this.cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
      db,
      this.cryptography,
    );
    this.accountRepository = new AccountRepository(db, this.cryptography);
    this.bypassAmountValidation = options.bypassAmountValidation ?? false;
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

      const callback = `${this.baseUrl}/api/lnurlp/callback/${user.id}`;
      const address = `${user.username}@${new URL(this.baseUrl).host}`;
      const metadata = JSON.stringify([
        ['text/plain', `Pay to ${address}`],
        ['text/identifier', address],
      ]);

      return {
        callback,
        maxSendable: this.maxSendable.toNumber('msat'),
        minSendable: this.minSendable.toNumber('msat'),
        metadata,
        tag: 'payRequest',
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
  async handleLnurlpCallback(
    userId: string,
    amount: Money<'BTC'>,
  ): Promise<LNURLPayResult | LNURLError> {
    if (
      amount.lessThan(this.minSendable) ||
      amount.greaterThan(this.maxSendable)
    ) {
      return {
        status: 'ERROR',
        reason: `Amount out of range. Min: ${this.minSendable.toNumber('sat')} sats, Max: ${this.maxSendable.toNumber('sat').toLocaleString()} sats.`,
      };
    }

    try {
      const user = await this.userRepository.get(userId);

      if (!user) {
        return {
          status: 'ERROR',
          reason: 'not found',
        };
      }

      const cashuReceiveQuoteService = new CashuReceiveQuoteService(
        {
          ...this.cryptography,
          getXpub: () => Promise.resolve(user.cashuLockingXpub),
        },
        this.cashuReceiveQuoteRepository,
      );

      // For external lightning address requests, we only support BTC to avoid exchange rate mismatches.
      // However, if bypassAmountValidation is enabled, we can use the user's default currency
      // and perform exchange rate conversion to create an invoice in their preferred currency.
      const account = await this.userRepository.getDefaultAccount(
        userId,
        this.bypassAmountValidation ? undefined : 'BTC',
      );

      if (account.type !== 'cashu') {
        throw new Error(`Account type not supported. Got ${account.type}`);
      }

      let amountToReceive: Money = amount as Money;
      if (amount.currency !== account.currency) {
        const rate = await this.exchangeRateService.getRate(
          `${amount.currency}-${account.currency}`,
        );
        amountToReceive = amount.convert(account.currency, rate) as Money;
      }

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
}
