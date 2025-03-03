import { getDecodedToken } from "@cashu/cashu-ts";

// NOTE: the mint url changed so this is a hacky solution to make it so that
// all outstanding tokens with the old mint url will still work

const TO_REPLACE = "https://stablenut.umint.cash";
const NEW_VALUE = "https://stablenut.cashu.network";

export const getDecodedTokenModified = (token: string) => {
   const decoded = getDecodedToken(token);
   let tokenMintUrl = decoded.token[0].mint;
   if (tokenMintUrl.includes(TO_REPLACE)) {
      tokenMintUrl = tokenMintUrl.replace(TO_REPLACE, NEW_VALUE);
   }
   decoded.token[0].mint = tokenMintUrl;
   return decoded;
};
