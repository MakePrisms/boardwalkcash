import bolt11Decoder, { type Section } from 'light-bolt11-decoder';

/**
 * Decodes a BOLT11 invoice
 * @param invoice invoice to decode
 */
export const decodeBolt11 = (invoice: string) => {
  const { sections } = bolt11Decoder.decode(invoice.replace(/^lightning:/, ''));

  const amountSection = findSection(sections, 'amount');
  const amountSat = amountSection?.value
    ? Number(amountSection.value) / 1000
    : undefined;

  const expirySection = findSection(sections, 'expiry');
  const timestampSection = findSection(sections, 'timestamp');

  let expiryUnixSec: number | undefined = undefined;
  if (expirySection && timestampSection) {
    expiryUnixSec = timestampSection.value + expirySection.value;
  }

  const expiryUnixMs = expiryUnixSec ? expiryUnixSec * 1000 : undefined;

  const networkSection = findSection(sections, 'coin_network')?.value;
  const networkPrefix = networkSection?.bech32;
  const network = networkPrefix ? getNetwork(networkPrefix) : undefined;

  const descriptionSection = findSection(sections, 'description');
  const description = descriptionSection?.value;

  return { amountSat, expiryUnixMs, network, description };
};

/**
 * Checks if a string is a valid BOLT11 invoice
 * @param invoice invoice to check
 */
export const isBolt11Invoice = (invoice: string) => {
  try {
    decodeBolt11(invoice);
    return true;
  } catch {
    return false;
  }
};

const findSection = <T extends Section['name']>(
  sections: Section[],
  sectionName: T,
): Extract<Section, { name: T }> | undefined => {
  return sections.find((s) => s.name === sectionName) as
    | Extract<Section, { name: T }>
    | undefined;
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
