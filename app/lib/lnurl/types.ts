export type LNURLError = {
  status: 'ERROR';
  reason: string;
};

/** Response from the lnurlp endpoint */
export type LNURLPayParams = {
  tag: 'payRequest';
  /** URL to get the invoice  */
  callback: string;
  domain: string;
  /** Minimum amount in msat that can be requested */
  minSendable: number;
  /** Maximum amount in msat that can be requested */
  maxSendable: number;
  metadata: string;
  decodedMetadata: string[][];
  commentAllowed: number;
};

/** Response from the lnurlp callback */
export type LNURLPayResult = {
  /** bech-32 encoded bolt11 invoice */
  pr: string;
  /** optional URL to check the status of the invoice */
  verify?: string;
};

/** Response from the verify endpoint returned by the lnurlp callback */
export type LNURLVerifyResult = {
  status: 'OK';
  settled?: boolean;
  preimage?: string | null;
  /** bech-32 encoded bolt11 invoice */
  pr?: string;
};
