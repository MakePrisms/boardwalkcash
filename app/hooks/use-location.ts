import { useRouteLoaderData } from 'react-router';
import type { Info as RootInfo } from '../+types/root';

const useLocationData = () => {
  const { domain, origin } =
    useRouteLoaderData<RootInfo['loaderData']>('root') ?? {};

  if (!domain || !origin) {
    throw new Error('Domain or origin not found');
  }

  return { domain, origin };
};

export default useLocationData;
