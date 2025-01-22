import bolt11Decoder, { type Section } from 'light-bolt11-decoder';

const findSection = <T extends Section['name']>(
  sections: Section[],
  sectionName: T,
): Extract<Section, { name: T }> | undefined => {
  return sections.find((s) => s.name === sectionName) as
    | Extract<Section, { name: T }>
    | undefined;
};

/**
 * Decodes a BOLT11 invoice
 * @param invoice invoice to decode
 * @returns invoice `amountSat` and `expiryUnixMs`. `expiryUnixMs` is undefined if the invoice does not have an expiry
 */
export const decodeBolt11 = (invoice: string) => {
  const decoded = bolt11Decoder.decode(invoice.replace(/^lightning:/, ''));

  const amountSection = findSection(decoded.sections, 'amount');
  const amountSat = amountSection?.value
    ? Number(amountSection.value) / 1000
    : undefined;

  const expirySection = findSection(decoded.sections, 'expiry');
  const timestampSection = findSection(decoded.sections, 'timestamp');

  let expiryUnixSec: number | undefined = undefined;
  if (expirySection && timestampSection) {
    expiryUnixSec = timestampSection.value + expirySection.value;
  }

  const expiryUnixMs = expiryUnixSec ? expiryUnixSec * 1000 : undefined;

  const networkSection = findSection(decoded.sections, 'coin_network')?.value;
  const networkPrefix = networkSection?.bech32;
  const network = networkPrefix ? getNetwork(networkPrefix) : undefined;

  console.log('network');

  return { amountSat, expiryUnixMs, network };
};

/**
 * @see https://github.com/lightning/bolts/blob/master/11-payment-encoding.md#human-readable-part
 */
const getNetwork = (networkPrefix: string) => {
  switch (networkPrefix) {
    case 'bc':
      return 'bitcoin';
    case 'tb':
      return 'testnet';
    case 'tbs':
      return 'signet';
    case 'bcrt':
      return 'regtest';
    default:
      return 'unknown';
  }
};
