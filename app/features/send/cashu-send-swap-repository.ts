import {
  OutputData,
  type Proof,
  type SerializedBlindedMessage,
} from '@cashu/cashu-ts';
import { Money } from '~/lib/money';
import { hexToUint8Array } from '~/lib/utils';
import { uint8ArrayToHex } from '~/lib/utils';
import type { CashuAccount } from '../accounts/account';
import { AccountRepository } from '../accounts/account-repository';
import {
  type BoardwalkDb,
  type BoardwalkDbCashuSendSwap,
  boardwalkDb,
} from '../boardwalk-db/database';
import { useCashuCryptography } from '../shared/cashu';
import { getDefaultUnit } from '../shared/currencies';
import type { CashuSendSwap } from './cashu-send-swap';

type Options = {
  abortSignal?: AbortSignal;
};

type Encryption = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

type CreateSendSwap = {
  /**
   * The id of the account to send from
   */
  accountId: string;
  /**
   * The id of the user creating the swap
   */
  userId: string;
  /**
   * The requested amount to send in the account's currency.
   */
  amountRequested: Money;
  /**
   * The full amount to send including the fee in the account's currency.
   */
  amountToSend: Money;
  /**
   * The fee for the swap in the account's currency.
   */
  fee: Money;
  /**
   * The proofs being spent as inputs.
   */
  inputProofs: Proof[];
  /**
   * The proofs that we can send.
   * If inputProofs sums to amountToSend, these will be the same;
   * otherwise this will be undefined and we will need to swap to get the correct amount.
   */
  proofsToSend?: Proof[];
  /**
   * All remaining proofs to keep in the account.
   */
  accountProofs: Proof[];
  /**
   * The mint url of the account to send from.
   */
  mintUrl: string;
  /**
   * The keuset id that was used to create the output data.
   */
  keysetId: string;
  /**
   * The starting counter of the keyset that was used to create the output data.
   */
  keysetCounter: number;
  /**
   * The output data to use for performing the swap.
   */
  outputData: {
    keep: OutputData[];
    send: OutputData[];
  };
  /**
   * The version seen by the client for optimistic concurrency control.
   */
  accountVersion: number;
};

export type SerializedOutputData = {
  blindedMessage: SerializedBlindedMessage;
  blindingFactor: string;
  secret: string;
};

export class CashuSendSwapRepository {
  constructor(
    private db: BoardwalkDb,
    private readonly encryption: Encryption,
  ) {}

  async create(
    {
      accountId,
      userId,
      amountRequested,
      amountToSend,
      fee,
      mintUrl,
      inputProofs,
      proofsToSend,
      accountProofs,
      keysetId,
      keysetCounter,
      outputData,
      accountVersion,
    }: CreateSendSwap,
    options?: Options,
  ) {
    const [
      encryptedInputProofs,
      encryptedAccountProofs,
      encryptedProofsToSend,
    ] = await Promise.all([
      this.encryption.encrypt(inputProofs),
      this.encryption.encrypt(accountProofs),
      proofsToSend ? this.encryption.encrypt(proofsToSend) : undefined,
    ]);

    const unit = getDefaultUnit(amountToSend.currency);

    // TODO: either encrypt output data or regenerate it in the service methods
    const serializedSendOutputData = outputDataToJson(outputData.send);
    const serializedKeepOutputData = outputDataToJson(outputData.keep);

    const query = this.db.rpc('create_cashu_send_swap', {
      p_user_id: userId,
      p_account_id: accountId,
      p_amount_requested: amountRequested.toNumber(unit),
      p_amount_to_send: amountToSend.toNumber(unit),
      p_fee: fee.toNumber(unit),
      p_input_proofs: encryptedInputProofs,
      p_account_proofs: encryptedAccountProofs,
      p_keyset_id: keysetId,
      p_keyset_counter: keysetCounter,
      p_keep_output_data: serializedKeepOutputData,
      p_send_output_data: serializedSendOutputData,
      p_currency: amountToSend.currency,
      p_mint_url: mintUrl,
      p_unit: unit,
      p_state: proofsToSend ? 'READY' : 'SWAPPING',
      p_account_version: accountVersion,
      p_proofs_to_send: encryptedProofsToSend,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to create cashu send swap', {
        cause: error,
      });
    }

    if (!data?.created_swap) {
      throw new Error('Failed to create cashu send swap: no swap created');
    }

    const updatedSwap = await CashuSendSwapRepository.toSwap(
      data.created_swap,
      this.encryption.decrypt,
    );
    const updatedAccount = await AccountRepository.toAccount(
      data.updated_account,
      this.encryption.decrypt,
    );

    return {
      updatedSwap,
      updatedAccount: updatedAccount as CashuAccount,
    };
  }

  async completeSwap({
    swapId,
    swapVersion,
    accountVersion,
    proofsToSend,
    accountProofs,
  }: {
    /**
     * The id of the swap to complete.
     */
    swapId: string;
    /**
     * The version of the swap to complete.
     */
    swapVersion: number;
    /**
     * The version of the account to complete.
     */
    accountVersion: number;
    /**
     * The sendable proofs
     */
    proofsToSend: Proof[];
    /**
     * The account proofs to keep.
     */
    accountProofs: Proof[];
  }) {
    const [encryptedProofsToSend, encryptedAccountProofs] = await Promise.all([
      this.encryption.encrypt(proofsToSend),
      this.encryption.encrypt(accountProofs),
    ]);

    const query = this.db.rpc('complete_cashu_send_swap', {
      p_swap_id: swapId,
      p_swap_version: swapVersion,
      p_account_version: accountVersion,
      p_proofs_to_send: encryptedProofsToSend,
      p_account_proofs: encryptedAccountProofs,
    });

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to complete cashu send swap', {
        cause: error,
      });
    }

    if (!data?.updated_swap) {
      throw new Error('Failed to complete cashu send swap: no swap updated');
    }

    const updatedSwap = await CashuSendSwapRepository.toSwap(
      data.updated_swap,
      this.encryption.decrypt,
    );
    const updatedAccount = await AccountRepository.toAccount(
      data.updated_account,
      this.encryption.decrypt,
    );

    return {
      updatedSwap,
      updatedAccount: updatedAccount as CashuAccount,
    };
  }

  async getUnresolved(userId: string, options?: Options) {
    const query = this.db
      .from('cashu_send_swaps')
      .select()
      .eq('user_id', userId)
      .in('state', ['SWAPPING', 'READY']);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get unresolved cashu send swaps', {
        cause: error,
      });
    }

    return await Promise.all(
      data.map((data) =>
        CashuSendSwapRepository.toSwap(data, this.encryption.decrypt),
      ),
    );
  }

  static async toSwap(
    data: BoardwalkDbCashuSendSwap,
    decrypt: Encryption['decrypt'],
  ): Promise<CashuSendSwap> {
    const [inputProofs, proofsToSend] = await Promise.all([
      decrypt<Proof[]>(data.input_proofs),
      data.proofs_to_send ? decrypt<Proof[]>(data.proofs_to_send) : undefined,
    ]);

    const toMoney = (amount: number) => {
      return new Money({
        amount,
        currency: data.currency,
        unit: data.unit,
      });
    };

    return {
      id: data.id,
      accountId: data.account_id,
      userId: data.user_id,
      transactionId: data.transaction_id,
      amountRequested: toMoney(data.amount_requested),
      amountToSend: toMoney(data.amount_to_send),
      fee: toMoney(data.fee),
      inputProofs,
      proofsToSend,
      mintUrl: data.mint_url,
      keysetId: data.keyset_id,
      keysetCounter: data.keyset_counter,
      outputData: {
        keep: jsonToOutputData(data.keep_output_data),
        send: jsonToOutputData(data.send_output_data),
      },
      currency: data.currency,
      version: data.version,
      state: data.state,
    };
  }
}

export function useCashuSendSwapRepository() {
  const encryption = useCashuCryptography();
  return new CashuSendSwapRepository(boardwalkDb, encryption);
}

const outputDataToJson = (outputData: OutputData[]): SerializedOutputData[] => {
  return outputData.map((data) => ({
    blindedMessage: data.blindedMessage,
    blindingFactor: data.blindingFactor.toString(),
    secret: uint8ArrayToHex(data.secret),
  }));
};

const jsonToOutputData = (
  serializedOutputData: SerializedOutputData[],
): OutputData[] => {
  return serializedOutputData.map((data) => {
    return new OutputData(
      data.blindedMessage,
      BigInt(data.blindingFactor),
      hexToUint8Array(data.secret),
    );
  });
};
