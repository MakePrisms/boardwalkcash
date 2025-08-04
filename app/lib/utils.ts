import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sum(numbers: number[]) {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}

export function hexToUint8Array(hex: string) {
  return new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  );
}

export function uint8ArrayToHex(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function isSubset<T>(subset: Set<T>, superset: Set<T>): boolean {
  const isSubsetOf = (
    subset as unknown as {
      isSubsetOf?: (other: ReadonlySet<T>) => boolean;
    }
  ).isSubsetOf;

  if (typeof isSubsetOf === 'function') {
    return isSubsetOf.call(subset, superset);
  }

  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns a string with the middle part replaced with ellipses.
 * @param value - The string to replace the middle part of.
 * @param maxLength - The maximum length of the returned string including the ellipses.
 * @param startLength - The length of the start part.
 * @param endLength - The length of the end part.
 */
export function middleEllipsis(
  value: string,
  {
    maxLength,
    startLength,
    endLength,
  }: {
    maxLength: number;
    startLength: number;
    endLength: number;
  },
) {
  if (value.length <= maxLength) {
    return value;
  }
  // Ensure start and end portions don't overlap
  // Account for the "..." (3 characters) in the middle
  const availableLength = value.length - 3;

  if (startLength + endLength > availableLength) {
    // Adjust lengths to prevent overlap
    const total = startLength + endLength;
    const adjustedStartLength = Math.floor(
      (startLength / total) * availableLength,
    );
    const adjustedEndLength = availableLength - adjustedStartLength;

    return `${value.slice(0, adjustedStartLength)}...${value.slice(-adjustedEndLength)}`;
  }

  return `${value.slice(0, startLength)}...${value.slice(-endLength)}`;
}
