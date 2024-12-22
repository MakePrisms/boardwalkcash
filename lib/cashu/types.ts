/**
 * Tags are part of the data in a NUT-10 secret and hold additional data committed to
 * and can be used for feature extensions.
 *
 * Tags are arrays with two or more strings being `["key", "value1", "value2", ...]`.
 *
Supported tags are:

 * - `sigflag`: <str> determines whether outputs have to be signed as well
 * - `n_sigs`: <int> specifies the minimum number of valid signatures expected
 * - `pubkeys`: <hex_str> are additional public keys that can provide signatures (allows multiple entries)
 * - `locktime`: <int> is the Unix timestamp of when the lock expires
 * - `refund`: <hex_str> are optional refund public keys that can exclusively spend after locktime (allows multiple entries)
 *
 * @example
 * ```typescript
 * const tag: NUT10SecretTag = ["sigflag", "SIG_INPUTS"];
 * ```
 */
export type NUT10SecretTag = [string, ...string[]];

/**
 * CAUTION: If the mint does not support spending conditions or a specific kind
 * of spending condition, proofs may be treated as a regular anyone-can-spend tokens.
 * Applications need to make sure to check whether the mint supports a specific kind of
 * spending condition by checking the mint's info endpoint.
 */
export const WELL_KNOWN_SECRET_KINDS = ['P2PK'] as const;

/**
 * the kind of the spending condition
 */
export type WellKnownSecretKind = (typeof WELL_KNOWN_SECRET_KINDS)[number];

/**
 * The data from a parsed stringified NUT-10 secret
 */
export type NUT10SecretData = {
  nonce: string;
  data: string;
  tags?: NUT10SecretTag[];
};

/**
 * The raw NUT-10 secret from parsing the proof secret that describes the spending conditions
 * of the proof.
 * @example
 * ```json
 * ["P2PK", {
 *   "nonce": "859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f",
 *   "data": "0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7",
 *   "tags": [["sigflag", "SIG_INPUTS"]]
 * }]
 * ```
 */
export type ParsedNUT10Secret = [WellKnownSecretKind, NUT10SecretData];

/**
 * A NUT-10 secret in a proof is stored as a JSON string of a tuple:
 * [kind, {nonce, data, tags?}]
 *
 * When parsed, it is transformed into this object format.
 * @example
 * ```json
 * {
 *   "secret": "[\"P2PK\", {
 *     \"nonce\": \"859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f\",
 *     \"data\": \"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7\",
 *     \"tags\": [[\"sigflag\", \"SIG_INPUTS\"]]
 *   }]"
 * }
 * ```
 *
 * Gets parsed into:
 * ```json
 * {
 *   "kind": "P2PK",
 *   "data": "0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7",
 *   "nonce": "859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f",
 *   "tags": [["sigflag", "SIG_INPUTS"]]
 * }
 * ```
 */
export type NUT10Secret = {
  /**
   * well-known secret kind
   * @example "P2PK"
   */
  kind: WellKnownSecretKind;
  /**
   * Expresses the spending condition specific to each kind
   * @example "0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7"
   */
  data: string;
  /**
   * A unique random string
   * @example "859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f"
   */
  nonce: string;
  /**
   * Hold additional data committed to and can be used for feature extensions
   * @example [["sigflag", "SIG_INPUTS"]]
   */
  tags?: NUT10SecretTag[];
};

/**
 * A plain secret is a random string
 *
 * @see https://github.com/cashubtc/nuts/blob/main/00.md for plain string secret format
 */
export type PlainSecret = string;

/**
 * A proof secret can be either be a random string or a NUT-10 secret
 *
 * @see https://github.com/cashubtc/nuts/blob/main/10.md for NUT-10 secret format
 * @see https://github.com/cashubtc/nuts/blob/main/00.md for plain string secret format
 */
export type ProofSecret = NUT10Secret | PlainSecret;

/**
 * A P2PK secret requires a valid signature for the given pubkey
 *
 * @see https://github.com/cashubtc/nuts/blob/main/11.md for Pay-to-Pub-Key (P2PK) spending condition
 */
export type P2PKSecret = NUT10Secret & { kind: 'P2PK' };
