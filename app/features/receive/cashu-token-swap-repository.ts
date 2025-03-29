import type { Proof } from '@cashu/cashu-ts';
import { Money } from '~/lib/money';
import {
  type BoardwalkDb,
  type BoardwalkDbCashuTokenSwap,
  boardwalkDb,
} from '../boardwalk-db/database';
import { getDefaultUnit } from '../shared/currencies';
import { useEncryption } from '../shared/encryption';
import type { CashuTokenSwap } from './cashu-token-swap';

type Options = {
  abortSignal?: AbortSignal;
};

type Encryption = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

type CreateTokenSwap = {
  /**
   * ID of the receiving user.
   */
  userId: string;
  /**
   * ID of the receiving account.
   */
  accountId: string;
  /**
   * Amount of the token being claimed.
   */
  amount: Money;
  /**
   * Keyset ID.
   */
  keysetId: string;
  /**
   * Keyset counter.
   */
  keysetCounter: number;
  /**
   * Output amounts.
   */
  outputAmounts: number[];
  /**
   * Cashu proofs being claimed
   */
  proofs: Proof[];
  /**
   * A SHA256 hash of the token being claimed.
   */
  tokenHash: string;
  /**
   * Version of the account as seen by the client. Used for optimistic concurrency control.
   */
  accountVersion: number;
};

export class CashuTokenSwapRepository {
  constructor(
    private readonly db: BoardwalkDb,
    private readonly encryption: Encryption,
  ) {}

  /**
   * Creates a cashu token swap and updates the account keyset counter.
   * @returns Created cashu token swap.
   */
  async create(
    {
      userId,
      accountId,
      amount,
      keysetId,
      keysetCounter,
      outputAmounts,
      proofs,
      tokenHash,
      accountVersion,
    }: CreateTokenSwap,
    options?: Options,
  ): Promise<CashuTokenSwap> {
    const encryptedProofs = await this.encryption.encrypt(proofs);
    const unit = getDefaultUnit(amount.currency);

    // QEUSTION: do we need this? I did it so that we can update the account keyset counter.
    // in the same transaction as the token swap being created
    const query = this.db.rpc('create_token_swap', {
      p_token_hash: tokenHash,
      p_token_proofs: encryptedProofs,
      p_account_id: accountId,
      p_user_id: userId,
      p_currency: amount.currency,
      p_unit: unit,
      p_keyset_id: keysetId,
      p_keyset_counter: keysetCounter,
      p_output_amounts: outputAmounts,
      p_amount: amount.toNumber(unit),
      p_account_version: accountVersion,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to create token swap', { cause: error });
    }

    return CashuTokenSwapRepository.toTokenSwap(data, this.encryption.decrypt);
  }

  /**
   * Completes the token claiming process.
   * Updates the account with new proofs and sets the state to COMPLETED.
   */
  async completeTokenSwap(
    {
      tokenHash,
      proofs,
      accountVersion,
    }: {
      /**
       * Hash of the token that was claimed.
       */
      tokenHash: string;
      /**
       * All proofs (existing and new) to be stored in the account.
       */
      proofs: Proof[];
      /**
       * Version of the account as seen by the client. Used for optimistic concurrency control.
       */
      accountVersion: number;
    },
    options?: Options,
  ): Promise<void> {
    const encryptedProofs = await this.encryption.encrypt(proofs);

    console.log(
      'about to complete token claim',
      tokenHash,
      proofs,
      accountVersion,
    );
    const query = this.db.rpc('complete_token_swap', {
      p_token_hash: tokenHash,
      proofs: encryptedProofs,
      account_version: accountVersion,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to complete token claim', error);
    }
  }

  async getAll(userId: string, options?: Options): Promise<CashuTokenSwap[]> {
    const query = this.db
      .from('cashu_token_swaps')
      .select('*')
      .eq('user_id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get all token swaps', { cause: error });
    }

    return Promise.all(
      data.map((item) =>
        CashuTokenSwapRepository.toTokenSwap(item, this.encryption.decrypt),
      ),
    );
  }

  async getPending(
    userId: string,
    options?: Options,
  ): Promise<CashuTokenSwap[]> {
    const query = this.db
      .from('cashu_token_swaps')
      .select('*')
      .eq('user_id', userId)
      .eq('state', 'PENDING');

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get pending token swaps', { cause: error });
    }

    return Promise.all(
      data.map((item) =>
        CashuTokenSwapRepository.toTokenSwap(item, this.encryption.decrypt),
      ),
    );
  }

  static async toTokenSwap(
    data: BoardwalkDbCashuTokenSwap,
    decryptData: Encryption['decrypt'],
  ): Promise<CashuTokenSwap> {
    const decryptedData = {
      ...data,
      token_proofs: await decryptData<Proof[]>(data.token_proofs),
    };

    return {
      id: decryptedData.token_hash,
      userId: decryptedData.user_id,
      accountId: decryptedData.account_id,
      tokenHash: decryptedData.token_hash,
      tokenProofs: decryptedData.token_proofs,
      amount: new Money({
        amount: decryptedData.amount,
        currency: decryptedData.currency,
        unit: decryptedData.unit,
      }),
      keysetId: data.keyset_id,
      keysetCounter: data.keyset_counter,
      outputAmounts: data.output_amounts,
      createdAt: data.created_at,
      state: data.state as CashuTokenSwap['state'],
    };
  }
}

/**
 * Returns a repository for managing cashu token swaps.
 */
export function useCashuTokenSwapRepository() {
  const encryption = useEncryption();
  return new CashuTokenSwapRepository(boardwalkDb, encryption);
}
