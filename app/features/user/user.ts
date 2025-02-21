import type { Currency } from '~/lib/money';

type CommonUserData = {
  id: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  defaultBtcAccountId: string;
  defaultUsdAccountId: string;
  defaultCurrency: Currency;
};

export type FullUser = CommonUserData & {
  email: string;
  isGuest: false;
};

export type GuestUser = CommonUserData & {
  isGuest: true;
};

export type User = FullUser | GuestUser;

export function shouldVerifyEmail(user: User): user is FullUser {
  return !user.isGuest && !user.emailVerified;
}
