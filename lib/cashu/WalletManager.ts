import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import * as bip39 from 'bip39';

export type Mint = {
  url: string;
  nickname?: string;
};

export type KeysetCounter = {
  id: string;
  counter: number;
};

export type TokenHistoryItem = {
  status: 'pending' | 'paid' | 'failed';
  token: string;
  amount: number;
  unit: string;
  timestamp: string;
};

export type InvoiceHistoryItem = {
  amount: number;
  bolt11: string;
  hash: string | null;
  memo: string | null;
  mint: string;
  quote: string;
  status: 'paid' | 'pending' | 'failed';
  unit: string;
};

export type CashuConfig = {
  mints: Mint[];
  activeMintUrl: string | null;
  activeUnit: string | null;
  bip39Mnemonic: string;
};

export type CashuTransactionHistory = {
  historyTokens: TokenHistoryItem[];
  invoiceHistory: InvoiceHistoryItem[];
};

type SchemaKeys =
  | 'config'
  | 'keysetCounters'
  | 'transactionHistory'
  | 'version';

// QUESTION: should we prefix these keys? ie cashu.version
export type SchemaKey = `${SchemaKeys}`;

type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// biome-ignore lint/suspicious/noExplicitAny: TODO - causes issues with some storages for get
export type Schema = Record<string, JSONValue | any>;
export type CashuSchema = {
  [K in SchemaKey]: K extends 'config'
    ? CashuConfig
    : K extends 'keysetCounters'
      ? Array<KeysetCounter>
      : K extends 'transactionHistory'
        ? CashuTransactionHistory
        : K extends 'version'
          ? string
          : never;
};

export type Storage<T extends Schema> = {
  put<K extends keyof T>(key: K, value: T[K]): Promise<void>;

  get<K extends keyof T>(key: K): Promise<T[K] | undefined>;

  delete(key: keyof T): Promise<void>;
};

export type CashuStorage = Storage<CashuSchema>;

// TODO: add schema validation for true type safety
const createLocalStorage = (): CashuStorage => {
  return {
    get: async <K extends SchemaKey>(key: K) =>
      JSON.parse(localStorage.getItem(key) || '') as CashuSchema[K],
    put: async <K extends SchemaKey>(key: K, value: CashuSchema[K]) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    delete: async (key) => {
      localStorage.removeItem(key);
    },
  };
};

export const createStoreFromKV = (
  getKV: (key: string) => Promise<string | undefined>,
  putKV: (key: string, value: string) => Promise<void>,
  deleteKV: (key: string) => Promise<void>,
): CashuStorage => {
  return {
    get: async <K extends SchemaKey>(
      key: K,
    ): Promise<CashuSchema[K] | undefined> => {
      const value = await getKV(key);
      if (!value) return undefined;
      return JSON.parse(value) as CashuSchema[K];
    },
    put: async <K extends SchemaKey>(
      key: K,
      value: CashuSchema[K],
    ): Promise<void> => {
      await putKV(key, JSON.stringify(value));
    },
    delete: async (key: SchemaKey): Promise<void> => {
      await deleteKV(key);
    },
  };
};

const initStore = async (storage: CashuStorage) => {
  await storage.put('version', 'v2.0.0');
  await storage.put('keysetCounters', []);
  await storage.put('transactionHistory', {
    historyTokens: [],
    invoiceHistory: [],
  });
  await storage.put('config', {
    mints: [],
    activeMintUrl: null,
    activeUnit: null,
    bip39Mnemonic: bip39.generateMnemonic(),
  });
};

class WalletManager {
  private storage: CashuStorage;
  private isLoaded = false;
  wallets: Map<string, Map<string, CashuWallet>> = new Map();
  activeUnit: string | null = null;
  activeMintUrl: string | null = null;

  constructor(storage?: CashuStorage) {
    this.storage = storage || createLocalStorage();
  }
  async load() {
    if (this.isLoaded) return;

    // TODO: get actual version dynamically
    const version = 'v2.0.0';
    const storeVersion = await this.storage.get('version');
    if (storeVersion === undefined) {
      await initStore(this.storage);
    } else if (storeVersion !== version) {
      // TODO: handle migration
      throw new Error(
        `Need to handle migration from ${storeVersion} to ${version}`,
      );
    }

    // initialize wallets
    const config = await this.storage.get('config');
    if (config === undefined) {
      throw new Error('Config is not initialized');
    }
    const mints = config.mints.map((mint) => new CashuMint(mint.url));
    const mintData = await Promise.all(
      mints.map(async (mint) => {
        const allKeys = (await mint.getKeys()).keysets;
        const allKeysets = (await mint.getKeySets()).keysets;
        const mintInfo = await mint.getInfo();
        return {
          mint,
          allKeys,
          allKeysets,
          mintInfo,
        };
      }),
    );

    const units = ['sat', 'usd'];
    const seed = new Uint8Array(bip39.mnemonicToSeedSync(config.bip39Mnemonic));

    // initialize wallet classes for each unit and mint
    for (const { mint, allKeys, allKeysets, mintInfo } of mintData) {
      const unitWallets = new Map<string, CashuWallet>();

      for (const unit of units) {
        const keys = allKeys.filter((k) => k.unit === unit);
        const keysets = allKeysets.filter((ks) => ks.unit === unit);
        // Skip if mint doesn't support this unit (no keys or keysets)
        if (keys.length > 0 && keysets.length > 0) {
          unitWallets.set(
            unit,
            new CashuWallet(mint, {
              unit,
              keys,
              keysets,
              mintInfo,
              bip39seed: seed,
            }),
          );
        }
      }

      if (unitWallets.size > 0) {
        this.wallets.set(mint.mintUrl, unitWallets);
      }
    }

    // this makes it so that wallet.keysetId gets initialized. Do we need this?
    for (const [_, wallets] of this.wallets) {
      for (const [_, wallet] of wallets) {
        await wallet.getKeys();
      }
    }

    this.activeMintUrl = config.activeMintUrl;
    this.activeUnit = config.activeUnit;
    this.isLoaded = true;
  }
}

export default WalletManager;
