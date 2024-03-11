export const assembleLightningAddress = (pubkey: string, host: string, formatted = false) => {
   let domain;

   if (host.includes('www')) {
      domain = host.split('.')[1] + '.' + host.split('.')[2];
   } else {
      domain = host;
   }

   const user = formatted ? pubkey.slice(0, 5) + '...' + pubkey.slice(-3) : pubkey;

   return `${user}@${domain}`;
};

export const getInvoiceFromLightningAddress = async (
   lightningAddress: string,
   amountMsat: number,
) => {
   try {
      const [pubkey, host] = lightningAddress.split('@');
      const url = `https://${host}/.well-known/lnurlp/${pubkey}`;
      const response = await fetch(url);
      const data = await response.json();
      const callback = data.callback;
      const callbackRes = await fetch(`${callback}?amount=${amountMsat}`);
      const callbackData = await callbackRes.json();
      const invoice = callbackData.pr;
      if (!invoice) {
         throw new Error('No invoice found in callback response');
      }
      return invoice;
   } catch (error) {
      throw new Error('An error occurred while fetching the invoice.');
   }
};
