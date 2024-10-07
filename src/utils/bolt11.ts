import bolt11Decoder from 'light-bolt11-decoder';

/**
 * Extract the amount in sats from an invoice
 * @param invoice
 * @returns
 */
export const getAmountFromInvoice = (invoice: string) => {
   // Decode the invoice
   const decodedInvoice = bolt11Decoder.decode(invoice);

   // Extract the amount from the decoded invoice
   const amount = Number(decodedInvoice.sections[2].value / 1000);
   return amount;
};

export const getAmountAndExpiryFromInvoice = (invoice: string) => {
   const decoded = bolt11Decoder.decode(invoice);

   const amount = Number(decoded.sections[2].value / 1000);
   const expiry = decoded.expiry + decoded.sections[4].value;

   return { amount, expiry };
};
