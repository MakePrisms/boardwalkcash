import { CashuMint } from '@cashu/cashu-ts';
import { CashuWallet } from '@cashu/cashu-ts';
import type { User } from '~/features/user/user';
import type {
  LNURLError,
  LNURLPayParams,
  LNURLPayResult,
} from '~/lib/lnurl/types';
import type { Money } from '~/lib/money';
import type { BoardwalkDb } from '../boardwalk-db/database';
import { UserRepository } from '../user/user-repository';
import { MintQuoteRepository } from './mint-quote-repository';

const getOriginFromRequest = (request: Request) => {
  const url = new URL(request.url);
  const protocol = url.origin.includes('localhost') ? 'http' : url.protocol;
  return `${protocol}://${url.host}`;
};

export class LightningAddressService {
  private baseUrl: string;
  private userRepository: UserRepository;
  private mintQuoteRepository: MintQuoteRepository;
  constructor(
    request: Request,
    private db: BoardwalkDb,
  ) {
    this.baseUrl = getOriginFromRequest(request);
    this.userRepository = new UserRepository(db);
    this.mintQuoteRepository = new MintQuoteRepository(db);
  }

  async processLNURLPRequest(
    username: string,
  ): Promise<LNURLPayParams | LNURLError> {
    try {
      const user = await this.userRepository.getByUsername(username);
      if (!user) {
        return {
          status: 'ERROR',
          reason: 'User not found',
        };
      }

      return this.getLnurlPayResponse(user);
    } catch (error) {
      console.error('Error processing LNURL-pay request:', error);
      return {
        status: 'ERROR',
        reason: 'Internal server error',
      };
    }
  }

  async processLNURLPCallback(
    userId: string,
    amount: Money<'BTC'>,
  ): Promise<LNURLPayResult | LNURLError> {
    try {
      // We hardcode the currency to BTC because that's the only account type we support
      // for lightning address payments.
      const account = await this.userRepository.defaultAccount(userId, 'BTC');
      if (account.type !== 'cashu') {
        return {
          status: 'ERROR',
          reason: 'User account type not supported',
        };
      }

      const wallet = new CashuWallet(new CashuMint(account.mintUrl));
      const mintQuote = await wallet.createMintQuote(amount.toNumber('sat'));

      // QUESTION: should we store the entire mintQuote including the bolt11? This way we don't need to
      // fetch the whole quote again. Although, we probably should fetch it every time to get the latest state
      // from the mint.
      await this.mintQuoteRepository.create({
        account_id: account.id,
        amount: amount.toNumber('sat'),
        quote_id: mintQuote.quote,
        user_id: userId,
      });

      return {
        pr: mintQuote.request,
        routes: [],
      };
    } catch (error) {
      console.error('Error processing LNURL-pay callback:', error);
      return {
        status: 'ERROR',
        reason: 'Internal server error',
      };
    }
  }

  private getLnurlPayResponse(user: User): LNURLPayParams {
    const callback = `${this.baseUrl}/api/lnurlp/callback/${user.id}`;
    const address = `${user.username}@${new URL(this.baseUrl).host}`;
    const metadata = JSON.stringify([
      ['text/plain', `Pay to ${address}`],
      ['text/identifier', address],
    ]);

    return {
      callback,
      maxSendable: 100_000_000_000, // 1 BTC
      minSendable: 1_000, // 1 sat
      metadata,
      tag: 'payRequest',
    };
  }
}
