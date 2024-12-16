const storageKey = 'guestAccount';

type GuestAccountDetails = {
  id: string;
  password: string;
};

const assertGuestAccountDetails = (
  value: unknown,
): value is GuestAccountDetails => {
  return (
    value instanceof Object &&
    'id' in value &&
    typeof value.id === 'string' &&
    'password' in value &&
    typeof value.password === 'string'
  );
};

const getGuestAccount = (): GuestAccountDetails | null => {
  const dataString = localStorage.getItem(storageKey);
  if (!dataString) {
    return null;
  }
  const dataObject = JSON.parse(dataString);
  if (!assertGuestAccountDetails(dataObject)) {
    console.error(
      'Invalid guest account data found in the storage',
      dataObject,
    );
    return null;
  }
  return dataObject;
};

const storeGuestAccount = (data: GuestAccountDetails) => {
  localStorage.setItem(storageKey, JSON.stringify(data));
};

const removeGuestAccount = () => {
  localStorage.removeItem(storageKey);
};

export const guestAccountStorage = {
  get: getGuestAccount,
  store: storeGuestAccount,
  clear: removeGuestAccount,
};
