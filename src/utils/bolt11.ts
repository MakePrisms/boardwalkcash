import bolt11Decoder, { Section } from 'light-bolt11-decoder';

const findSection = <T extends Section['name']>(
   sections: Section[],
   sectionName: T,
): Extract<Section, { name: T }> | undefined => {
   return sections.find(s => s.name === sectionName) as Extract<Section, { name: T }> | undefined;
};

/**
 * Decodes a BOLT11 invoice
 * @param invoice invoice to decode
 * @returns invoice `amountSat` and `expiryUnixMs`. `expiryUnixMs` is undefined if the invoice does not have an expiry
 */
export const decodeBolt11 = (invoice: string) => {
   const decoded = bolt11Decoder.decode(invoice);

   const amountSection = findSection(decoded.sections, 'amount');
   const amountSat = amountSection?.value ? Number(amountSection.value) / 1000 : undefined;

   const timestampSection = findSection(decoded.sections, 'timestamp');

   let expiryUnixSec: number | undefined = undefined;
   if (decoded.expiry && timestampSection) {
      expiryUnixSec = timestampSection.value + decoded.expiry;
   }

   const expiryUnixMs = expiryUnixSec ? expiryUnixSec * 1000 : undefined;

   return { amountSat, expiryUnixMs };
};
