import { type UserResponse, useOpenSecret } from '@opensecret/react';
import { useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useRef } from 'react';
import { useLongTimeout } from '~/hooks/use-long-timeout';
import { generateRandomPassword } from '~/lib/password-generator';
import { computeSHA256 } from '~/lib/sha256';
import { supabaseSessionStore } from '../agicash-db/supabse-session-store';
import { cashuSeedStore } from '../shared/cashu';
import { guestAccountStorage } from './guest-account-storage';

export type AuthUser = UserResponse['user'];

type AuthState = {
  loading: boolean;
} & (
  | {
      isLoggedIn: true;
      user: AuthUser;
    }
  | {
      isLoggedIn: false;
      user?: undefined;
    }
);

export const useAuthState = (): AuthState => {
  const {
    auth: { loading, user: openSecretResponse },
  } = useOpenSecret();
  const user = openSecretResponse?.user;

  if (!user) {
    return {
      loading,
      isLoggedIn: false,
    };
  }

  return {
    loading,
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

  /**
   * Initiates a Google authentication flow
   * Returns the auth URL to redirect the user to
   */
  initiateGoogleAuth: () => Promise<{
    /**
     * The auth URL to redirect the user to to perform the Google authentication flow
     */
    authUrl: string;
  }>;

  /**
   * Handles the Google authentication callback
   * @param code The code from the Google authentication callback
   * @param state The state from the Google authentication callback
   */
  handleGoogleAuthCallback: (code: string, state: string) => Promise<void>;
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
  const queryClient = useQueryClient();

  // We are doing this to keep references for these actions constant. Open secret implementation currently creates a new
  // reference for each render. See https://github.com/OpenSecretCloud/OpenSecret-SDK/blob/master/src/lib/main.tsx#L350
  const signUpRef = useRef<AuthActions['signUp']>(null);
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
  const initiateGoogleAuthRef = useRef<AuthActions['initiateGoogleAuth']>(null);
  if (!initiateGoogleAuthRef.current) {
    initiateGoogleAuthRef.current = () =>
      openSecret.initiateGoogleAuth('').then((response) => ({
        authUrl: response.auth_url,
      }));
  }
  const handleGoogleAuthCallbackRef =
    useRef<AuthActions['handleGoogleAuthCallback']>(null);
  if (!handleGoogleAuthCallbackRef.current) {
    handleGoogleAuthCallbackRef.current = (code: string, state: string) =>
      openSecret.handleGoogleCallback(code, state, '');
  }

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

  const signOut = useCallback(async () => {
    await signOutRef.current();
    supabaseSessionStore.getState().clear();
    cashuSeedStore.getState().clear();
    queryClient.clear();
  }, [queryClient]);

  return {
    signUp: signUpRef.current,
    signUpGuest,
    signIn: signInRef.current,
    signOut,
    requestPasswordReset,
    confirmPasswordReset: confirmPasswordResetRef.current,
    initiateGoogleAuth: initiateGoogleAuthRef.current,
    handleGoogleAuthCallback: handleGoogleAuthCallbackRef.current,
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
