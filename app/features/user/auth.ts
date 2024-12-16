import { type UserResponse, useOpenSecret } from '@opensecret/react';
import { useCallback, useMemo, useRef } from 'react';
import { guestAccountStorage } from '~/features/user/guest-account-storage';
import type { User } from '~/features/user/user';
import { generateRandomPassword } from '~/lib/password-generator';
import { computeSHA256 } from '~/lib/sha256';

const fromOpenSecretUser = (user: UserResponse['user']): User => {
  if (user.email) {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      loginMethod: user.login_method,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isGuest: false,
    };
  }

  return {
    id: user.id,
    emailVerified: user.email_verified,
    loginMethod: user.login_method,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    isGuest: true,
  };
};

type AuthState = {
  loading: boolean;
} & (
  | {
      isLoggedIn: true;
      user: User;
    }
  | {
      isLoggedIn: false;
      user?: undefined;
    }
);

export const useAuthState = (): AuthState => {
  const {
    auth: { user: userResponse, loading },
  } = useOpenSecret();
  const userData = userResponse?.user;
  const user = useMemo(() => {
    return userData ? fromOpenSecretUser(userData) : null;
  }, [userData]);

  if (!user) {
    return {
      loading,
      isLoggedIn: false,
    };
  }

  return {
    loading: loading,
    isLoggedIn: true,
    user,
  };
};

type AuthActions = {
  /**
   * Creates a new full user account. Automatically signs in the user after sign up.
   * @param email
   * @param password
   */
  signUp: (email: string, password: string) => Promise<void>;

  /**
   * Creates a new guest user account.  If the user has already signed up as a guest on the same device before, the sign
   * in to that account will be performed instead. Automatically signs in the user after sign up.
   */
  signUpGuest: () => Promise<void>;

  /**
   * Signs in the existing user
   * @param email
   * @param password
   */
  signIn: (email: string, password: string) => Promise<void>;

  /**
   * Signs out the current user
   */
  signOut: () => Promise<void>;

  /**
   * Requests a password reset for the account
   * @param email
   */
  requestPasswordReset: (
    email: string,
  ) => Promise<{ email: string; secret: string }>;

  /**
   * Confirms a password reset
   * @param email Email address for which the reset is performed Code that was sent to the email provided to `requestPasswordReset`
   * @param alphanumericCode Password reset code that was sent to the email address sent to `requestPasswordReset`
   * @param plaintextSecret Secret that was returned by `requestPasswordReset`
   * @param newPassword New password to set for the account
   */
  confirmPasswordReset: (
    email: string,
    alphanumericCode: string,
    plaintextSecret: string,
    newPassword: string,
  ) => Promise<void>;
};

/**
 * A hook that provides authentication actions by wrapping functionalities from the OpenSecret SDK.
 * The actions include user signing up, signing in, signing out, and handling password reset requests.
 * References for these actions are memoized to ensure consistent references across renders,
 * improving performance and preventing unnecessary re-renders or function evaluations.
 *
 * @returns {AuthActions}
 */
export const useAuthActions = (): AuthActions => {
  const openSecret = useOpenSecret();

  // We are doing this to keep references for these actions constant. Open secret implementation currently creates a new
  // reference for each render. See https://github.com/OpenSecretCloud/OpenSecret-SDK/blob/master/src/lib/main.tsx#L350
  const signUpRef = useRef<AuthActions['signUp']>();
  if (!signUpRef.current) {
    signUpRef.current = (email: string, password: string) =>
      openSecret.signUp(email, password, '');
  }
  const signUpGuestRef = useRef(openSecret.signUpGuest);
  const signInRef = useRef(openSecret.signIn);
  const signInGuestRef = useRef(openSecret.signInGuest);
  const signOutRef = useRef(openSecret.signOut);
  const requestPasswordResetRef = useRef(openSecret.requestPasswordReset);
  const confirmPasswordResetRef = useRef(openSecret.confirmPasswordReset);

  const signUpGuest = useCallback(() => {
    const existingGuestAccount = guestAccountStorage.get();
    if (existingGuestAccount) {
      return signInGuestRef.current(
        existingGuestAccount.id,
        existingGuestAccount.password,
      );
    }

    const createGuestAccount = async () => {
      const password = generateRandomPassword(32);
      const guestAccount = await signUpGuestRef.current(password, '');
      guestAccountStorage.store({ id: guestAccount.id, password });
    };

    return createGuestAccount();
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const secret = generateRandomPassword(20);
    const hash = await computeSHA256(secret);
    await requestPasswordResetRef.current(email, hash);
    return { email, secret };
  }, []);

  return {
    signUp: signUpRef.current,
    signUpGuest,
    signIn: signInRef.current,
    signOut: signOutRef.current,
    requestPasswordReset,
    confirmPasswordReset: confirmPasswordResetRef.current,
  };
};
