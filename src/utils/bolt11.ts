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

   const expiryUnixSeconds = decoded.expiry;
   const expiryUnixMs = decoded.expiry * 1000;

   return { amountSat, expiryUnixMs };
};
