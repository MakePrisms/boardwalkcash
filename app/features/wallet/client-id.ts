const CLIENT_ID_KEY = 'clientId';

export const getClientId = () => {
  if (typeof window === 'undefined') {
    throw new Error('getClientId can only be called on the client');
  }

  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  return clientId;
};
