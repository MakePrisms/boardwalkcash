import { getCashuWallet } from '~/lib/cashu';
import type {
  LNURLError,
  LNURLPayParams,
  LNURLPayResult,
  LNURLVerifyResult,
} from '~/lib/lnurl/types';
import { Money } from '~/lib/money';
import { AccountRepository } from '../accounts/account-repository';
import type { BoardwalkDb } from '../boardwalk-db/database';
import type { CashuCryptography } from '../shared/cashu';
import { UserRepository } from '../user/user-repository';
import { CashuReceiveQuoteRepository } from './cashu-receive-quote-repository';
import { CashuReceiveQuoteService } from './cashu-receive-quote-service';

// TODO: Is there a better way to do this? We don't need any of this for the lightning address service to work,
// but there could be some hidden bugs that appear if we do it this way. We could also make each of these optional
// and only set the ones we need, then throw an error in the services and repositories if the needed methods are not set.
const fakeCryptography: CashuCryptography = {
  encrypt: async <T = unknown>(data: T) => JSON.stringify(data),
  decrypt: async <T = unknown>(data: string) => data as T,
  getSeed: () => Promise.resolve(new Uint8Array()),
  getXpub: () => Promise.resolve(''),
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
  private cashuReceiveQuoteRepository: CashuReceiveQuoteRepository;
  private accountRepository: AccountRepository;
  private minSendable: Money<'BTC'>;
  private maxSendable: Money<'BTC'>;

  constructor(request: Request, db: BoardwalkDb) {
    this.userRepository = new UserRepository(db, fakeCryptography);
    this.cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
      db,
      fakeCryptography,
    );
    this.accountRepository = new AccountRepository(db, fakeCryptography);
    this.baseUrl = getOriginFromRequest(request);
    this.minSendable = new Money({
      amount: 1,
      currency: 'BTC',
      unit: 'sat',
    });
    this.maxSendable = new Money({
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
        reason: 'Amount out of range.',
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
          ...fakeCryptography,
          getXpub: () => Promise.resolve(user.cashuLockingXpub),
        },
        this.cashuReceiveQuoteRepository,
      );

      const account = await this.userRepository.defaultAccount(userId, 'BTC');

      if (account.type !== 'cashu') {
        throw new Error(`Account type not supported. Got ${account.type}`);
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
