import type { OnchainMintQuoteResponse } from '@cashu/cashu-ts';
import { HARDENED_OFFSET } from '@scure/bip32';
import { getCashuUnit, getCashuWallet } from '~/lib/cashu';
import type { CashuAccount } from '../accounts/account';
import {
  BASE_CASHU_LOCKING_DERIVATION_PATH,
  type CashuCryptography,
  useCashuCryptography,
} from '../shared/cashu';
import { derivePublicKey } from '../shared/cryptography';
import type { ReusableCashuReceiveQuote } from './reusable-cashu-receive-quote';
import {
  type ReusableCashuReceiveQuoteRepository,
  useReusableCashuReceiveQuoteRepository,
} from './reusable-cashu-receive-quote-repository';

export type ReusableCashuReceiveOnchainQuote = {
  /**
   * The locked mint quote from the mint.
   */
  mintQuote: OnchainMintQuoteResponse;
  /**
   * The public key that locks the mint quote.
   */
  lockingPublicKey: string;
  /**
   * The full derivation path of the locking key. This is needed to derive the private key to unlock the mint quote.
   */
  fullLockingDerivationPath: string;
  /**
   * The expiration date of the mint quote.
   */
  expiresAt?: string;
};

export class ReusableCashuReceiveQuoteService {
  constructor(
    private readonly cryptography: CashuCryptography,
    private readonly reusableCashuReceiveQuoteRepository: ReusableCashuReceiveQuoteRepository,
  ) {}

  /**
   * Gets a locked mint quote response for receiving onchain payments (reusable).
   * @returns The mint quote response and related data needed to create a reusable receive quote.
   */
  async getOnchainQuote({
    account,
  }: {
    account: CashuAccount;
  }): Promise<ReusableCashuReceiveOnchainQuote> {
    const cashuUnit = getCashuUnit(account.currency);

    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
    });

    const { lockingPublicKey, fullLockingDerivationPath } =
      await this.deriveNut20LockingPublicKey();

    const mintQuoteResponse =
      await wallet.createMintQuoteOnchain(lockingPublicKey);

    const expiresAt = mintQuoteResponse.expiry
      ? new Date(mintQuoteResponse.expiry * 1000).toISOString()
      : undefined;

    return {
      mintQuote: mintQuoteResponse,
      lockingPublicKey,
      fullLockingDerivationPath,
      expiresAt,
    };
  }

  /**
   * Creates a new reusable cashu receive quote used for receiving via onchain payments.
   * @returns The created reusable cashu receive quote.
   */
  async createReusableOnchainQuote({
    userId,
    account,
    onchainQuote,
  }: {
    /**
     * The id of the user that will receive the money.
     */
    userId: string;
    /**
     * The cashu account to which the money will be received.
     */
    account: CashuAccount;
    /**
     * The onchain quote to create.
     */
    onchainQuote: ReusableCashuReceiveOnchainQuote;
  }): Promise<ReusableCashuReceiveQuote> {
    return this.reusableCashuReceiveQuoteRepository.create({
      userId,
      accountId: account.id,
      currency: account.currency,
      amount: null, // Onchain reusable quotes don't have a fixed amount, bolt12 mint quotes have option to set amount
      quoteId: onchainQuote.mintQuote.quote,
      paymentRequest: onchainQuote.mintQuote.request,
      expiresAt: onchainQuote.expiresAt || null,
      lockingDerivationPath: onchainQuote.fullLockingDerivationPath,
    });
  }

  private async deriveNut20LockingPublicKey() {
    const xpub = await this.cryptography.getXpub(
      BASE_CASHU_LOCKING_DERIVATION_PATH,
    );

    const unhardenedIndex = Math.floor(
      Math.random() * (HARDENED_OFFSET - 1),
    ).toString();

    const lockingKey = derivePublicKey(xpub, `m/${unhardenedIndex}`);

    return {
      lockingPublicKey: lockingKey,
      fullLockingDerivationPath: `${BASE_CASHU_LOCKING_DERIVATION_PATH}/${unhardenedIndex}`,
    };
  }
}

export function useReusableCashuReceiveQuoteService() {
  const cryptography = useCashuCryptography();
  const reusableCashuReceiveQuoteRepository =
    useReusableCashuReceiveQuoteRepository();
  return new ReusableCashuReceiveQuoteService(
    cryptography,
    reusableCashuReceiveQuoteRepository,
  );
}
