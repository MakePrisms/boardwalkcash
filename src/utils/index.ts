export const assembleLightningAddress = (pubkey: string, host: string, formatted=false) => {
  let domain;

  if (host.includes('www')) {
    console.log("INCXLUDES WWW")
    domain = host.split('.')[1] + '.' + host.split('.')[2];
  } else {
    console.log("NO WWW")
    domain = host
  }

  console.log("DOMAIN", domain)

  const user = formatted ? pubkey.slice(0, 5) + '...' + pubkey.slice(-3) : pubkey;

  return `${user}@${domain}`;
};