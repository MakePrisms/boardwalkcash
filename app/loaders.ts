import { useRouteLoaderData } from '@remix-run/react';
import type { RootLoaderData } from './root';

export type LoaderData = {
  root: RootLoaderData;
  // Add other route loader types here
};

export function getLoaderData<K extends keyof LoaderData>(
  route: K,
): LoaderData[K] {
  return useRouteLoaderData(route) as LoaderData[K];
}
