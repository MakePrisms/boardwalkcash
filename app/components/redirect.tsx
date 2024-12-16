import { useNavigate } from '@remix-run/react';
import type { To } from '@remix-run/router';
import type { PropsWithChildren } from 'react';
import type { NavigateOptions } from 'react-router';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

type Props = PropsWithChildren<{
  to: To;
  options?: NavigateOptions;
  logMessage?: string;
}>;

/**
 * Executes only on the initial render so any subsequent prop changes won't cause a redirect
 */
export const Redirect = ({
  to,
  options,
  children = null,
  logMessage,
}: Props) => {
  const navigate = useNavigate();

  useEffectNoStrictMode(() => {
    logMessage && console.debug(logMessage);
    navigate(to, options);
  }, []);

  return children;
};
