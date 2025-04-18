import type { User } from '~/features/user/user';
import { getCashuWallet } from '~/lib/cashu';
import type {
  LNURLError,
  LNURLPayParams,
  LNURLPayResult,
  LNURLVerifyResult,
} from '~/lib/lnurl/types';
import type { Money } from '~/lib/money';
import { Money as MoneyClass } from '~/lib/money/money';
import { AccountRepository } from '../accounts/account-repository';
import type { BoardwalkDb } from '../boardwalk-db/database';
import type { CashuCryptography } from '../shared/cashu';
import { UserRepository } from '../user/user-repository';
import { CashuReceiveQuoteRepository } from './cashu-receive-quote-repository';
import { CashuReceiveQuoteService } from './cashu-receive-quote-service';

const fakeCryptography: CashuCryptography = {
  encrypt: async <T = unknown>(data: T) => JSON.stringify(data),
  decrypt: async <T = unknown>(data: string) => data as T,
  getSeed: () => Promise.resolve(new Uint8Array()),
  getLockingKey: () => Promise.resolve(''),
  getLockingXpub: () => Promise.resolve(''),
  signMessage: () => Promise.resolve(''),
};

const getOriginFromRequest = (request: Request) => {
  const url = new URL(request.url);
  const protocol = url.origin.includes('localhost') ? 'http' : url.protocol;
  return `${protocol}://${url.host}`;
};

export class LightningAddressService {
  private baseUrl: string;
  private userRepository: UserRepository;
  private minSendable: Money<'BTC'>;
  private maxSendable: Money<'BTC'>;

  constructor(
    request: Request,
    private db: BoardwalkDb,
  ) {
    this.baseUrl = getOriginFromRequest(request);
    this.userRepository = new UserRepository(db, fakeCryptography);
    this.minSendable = new MoneyClass({
      amount: 1,
      currency: 'BTC',
      unit: 'sat',
    });
    this.maxSendable = new MoneyClass({
      amount: 1,
      currency: 'BTC',
      unit: 'btc',
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

      return this.getLnurlpParams(user);
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
   * @returns the bolt11 invoice from the receive quote.
   */
  async handleLnurlpCallback(
    userId: string,
    amount: Money<'BTC'>,
  ): Promise<LNURLPayResult | LNURLError> {
    const cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
      this.db,
      fakeCryptography,
    );

    try {
      const amountSats = amount.amount('sat');
      if (
        amountSats.lt(this.minSendable.amount('sat')) ||
        amountSats.gt(this.maxSendable.amount('sat'))
      ) {
        return {
          status: 'ERROR',
          reason: 'Amount out of range.',
        };
      }

      const user = await this.userRepository.get(userId);
      if (!user) {
        return {
          status: 'ERROR',
          reason: 'not found',
        };
      }

      const cashuReceiveQuoteService = new CashuReceiveQuoteService(
        {
          ...fakeCryptography,
          getLockingXpub: () => Promise.resolve(user.cashuLockingXpub),
        },
        cashuReceiveQuoteRepository,
      );

      // We hardcode the currency to BTC because that's the only account type we support
      // for lightning address payments.
      const account = await this.userRepository.defaultAccount(userId, 'BTC');
      if (account.type !== 'cashu') {
        return {
          status: 'ERROR',
          reason: 'User account type not supported',
        };
      }

      const quote = await cashuReceiveQuoteService.create({
        userId,
        account,
        amount: amount as Money,
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
   */
  async handleLnurlpVerify(
    receiveQuoteId: string,
  ): Promise<LNURLVerifyResult | LNURLError> {
    const accountRepository = new AccountRepository(this.db, fakeCryptography);
    const cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
      this.db,
      fakeCryptography,
    );

    try {
      const quote = await cashuReceiveQuoteRepository.get(receiveQuoteId);

      if (!quote) {
        return {
          status: 'ERROR',
          reason: 'Not found',
        };
      }

      const account = await accountRepository.get(quote.accountId);
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

  private getLnurlpParams(user: User): LNURLPayParams {
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
  }
}
