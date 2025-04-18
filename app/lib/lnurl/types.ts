export type LNURLError = {
  status: 'ERROR';
  reason: string;
};

/** Response from the lnurlp endpoint */
export type LNURLPayParams = {
  /** The type of the LNURL */
  tag: 'payRequest';
  /** The URL from LN SERVICE which will accept the pay request parameters */
  callback: string;
  /** Max millisatoshi amount LN SERVICE is willing to receive */
  maxSendable: number;
  /**
   * Min millisatoshi amount LN SERVICE is willing to receive,
   * can not be less than 1 or more than `maxSendable`
   */
  minSendable: number;
  /**
   * Metadata json which must be presented as raw string here,
   * this is required to pass signature verification at a later step
   */
  metadata: string;
  domain?: string;
  decodedMetadata?: string[][];
  commentAllowed?: number;
};

/** Response from the lnurlp callback */
export type LNURLPayResult = {
  /** bech-32 encoded bolt11 invoice */
  pr: string;
  /** optional URL to check the status of the invoice */
  verify?: string;
  /** optional routes to the invoice. Defaults to empty array */
  routes: string[];
};

/** Response from the verify endpoint returned by the lnurlp callback */
export type LNURLVerifyResult = {
  status: 'OK';
  settled?: boolean;
  preimage?: string | null;
  /** bech-32 encoded bolt11 invoice */
  pr?: string;
};
