import {
  getInvoiceFromLightningAddress,
  isLNURLError,
  verifyInvoice,
} from './index';

const addr = 'daimgood@getalby.com';
const amount = 10_000;

const res = await getInvoiceFromLightningAddress(addr, amount);
console.log('res', res);
if (isLNURLError(res)) {
  throw new Error(res.reason);
}
if (!res.verify) {
  throw new Error(`${addr} does not support LUD 21`);
}

const verifyRes = await verifyInvoice(res.verify);
console.log('verifyRes', verifyRes);
if (isLNURLError(verifyRes)) {
  throw new Error(verifyRes.reason);
}
