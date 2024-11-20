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
 * @returns decoded invoice data
 */
export const decodeBolt11 = (invoice: string) => {
   const decoded = bolt11Decoder.decode(invoice);

   const amountSection = findSection(decoded.sections, 'amount');
   const amountSat = amountSection?.value ? Number(amountSection.value) / 1000 : undefined;

   const expirySection = findSection(decoded.sections, 'expiry');
   const timestampSection = findSection(decoded.sections, 'timestamp');

   /* infinity if no expiry is defined */
   let expiryUnixSec = Infinity;
   if (expirySection && timestampSection) {
      expiryUnixSec = timestampSection.value + expirySection.value;
   } else if (decoded.expiry && timestampSection) {
      expiryUnixSec = timestampSection.value + decoded.expiry;
   }

   return { amountSat, expiryUnixMs: expiryUnixSec * 1000 };
};
