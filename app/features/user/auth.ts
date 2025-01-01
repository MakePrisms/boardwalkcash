import { type UserResponse, useOpenSecret } from '@opensecret/react';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useMemo, useRef } from 'react';
import { guestAccountStorage } from '~/features/user/guest-account-storage';
import type { User } from '~/features/user/user';
import { useLongTimeout } from '~/hooks/use-long-timeout';
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
      const password = await generateRandomPassword(32);
      const guestAccount = await signUpGuestRef.current(password, '');
      guestAccountStorage.store({ id: guestAccount.id, password });
    };

    return createGuestAccount();
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const secret = await generateRandomPassword(20);
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

type OpenSecretJwt = {
  /**
   * Token expiration time. It's a unix timestamp in seconds
   */
  exp: number;

  /**
   * Time when the token was issues. It's a unix timestamp in seconds
   */
  iat: number;

  /**
   * ID of the logged-in user
   */
  sub: string;

  /**
   * Audience
   */
  aud: 'access' | 'refresh';
};

const accessTokenKey = 'access_token';
const refreshTokenKey = 'refresh_token';

const getJwt = (key: string): OpenSecretJwt | null => {
  const jwt = localStorage.getItem(key);
  if (!jwt) {
    return null;
  }
  return jwtDecode<OpenSecretJwt>(jwt);
};

const removeKeys = () => {
  localStorage.removeItem(accessTokenKey);
  localStorage.removeItem(refreshTokenKey);
};

const getRefreshToken = () => getJwt(refreshTokenKey);

const getRemainingSessionTimeInMs = (
  token: OpenSecretJwt | null,
): number | null => {
  if (!token) {
    return null;
  }
  // We are treating the session as expired 5 seconds before the actual expiry just in case
  const fiveSecondsBeforeExpiry = token.exp - 5;
  const fiveSecondsBeforeExpiryInMs = fiveSecondsBeforeExpiry * 1000;
  const remainingTime = fiveSecondsBeforeExpiryInMs - Date.now();
  return Math.max(remainingTime, 0);
};

type HandleSessionExpiryProps = {
  isGuestAccount: boolean;
  onLogout: () => void;
};

export const useHandleSessionExpiry = ({
  isGuestAccount,
  onLogout,
}: HandleSessionExpiryProps) => {
  const { signUpGuest: extendGuestSession, signOut } = useAuthActions();
  const refreshToken = getRefreshToken();
  const remainingSessionTime = getRemainingSessionTimeInMs(refreshToken);

  const handleSessionExpiry = async () => {
    try {
      if (isGuestAccount) {
        // Extend guest session will get new extended access and refresh token from Open Secret. The OS code can be seen
        // here https://github.com/OpenSecretCloud/OpenSecret-SDK/blob/master/src/lib/main.tsx#L441. Because setState is
        // called after this method is executed the new render will be triggered and useHandleSessionExpiry will be
        // executed again which will result in new session expiry timeout being set.
        await extendGuestSession();
      } else {
        onLogout();
        // Open secret is already handling potential errors in signOut method and removes the keys from the storage so
        // in that case our catch should never be triggered, which is fine. We are leaving it there for the guest use
        // case and just in case.
        await signOut();
      }
    } catch (e) {
      console.error(
        'Failed to handle session expiry. Performing manual log out.',
        e,
      );
      removeKeys();
      window.location.reload();
    }
  };

  useLongTimeout(handleSessionExpiry, remainingSessionTime);
};
