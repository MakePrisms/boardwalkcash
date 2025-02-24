import type {
  BoardwalkDb,
  BoardwalkDbMintQuote,
} from '~/features/boardwalk-db/database';

type MintQuoteInput = Omit<BoardwalkDbMintQuote, 'id' | 'created_at'>;

export class MintQuoteRepository {
  constructor(private readonly db: BoardwalkDb) {}

  async create(mintQuote: MintQuoteInput) {
    const { data, error } = await this.db
      .from('mint_quotes')
      .insert(mintQuote)
      .select();
    if (error) {
      throw new Error('Failed to create mint quote', { cause: error });
    }
    return data;
  }
}
