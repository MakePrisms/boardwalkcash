export const assembleLightningAddress = (pubkey: string, host: string, formatted=false) => {
  let domain;

  if (host.includes('www')) {
    domain = host.split('.')[1] + '.' + host.split('.')[2];
  } else {
    domain = host
  }

  const user = formatted ? pubkey.slice(0, 5) + '...' + pubkey.slice(-3) : pubkey;

  return `${user}@${domain}`;
};