type CommonUserData = {
  id: string;
  emailVerified: boolean;
  loginMethod: string;
  createdAt: string;
  updatedAt: string;
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
