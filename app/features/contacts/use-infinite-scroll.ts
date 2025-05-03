import { useCallback, useEffect, useRef, useState } from 'react';

type UseInfiniteScrollOptions = {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  threshold?: number;
  debounceMs?: number;
};

/**
 * Hook that detects when a user has scrolled to the bottom of a container
 * and triggers a callback to load more content
 */
export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 100,
  debounceMs = 200,
}: UseInfiniteScrollOptions) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use useCallback to memoize these functions so they can be used in dependency arrays
  const checkIntersection = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { bottom } = container.getBoundingClientRect();
    const { innerHeight } = window;

    // Check if the bottom of the container is visible
    // with a threshold for pre-loading
    const isNearBottom = bottom <= innerHeight + threshold;
    setIsIntersecting(isNearBottom);
  }, [threshold]);

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      checkIntersection();
    }, debounceMs);
  }, [checkIntersection, debounceMs]);

  // Trigger load more when intersection is detected
  useEffect(() => {
    if (isIntersecting && !isLoading && hasMore) {
      onLoadMore();
    }
  }, [isIntersecting, isLoading, hasMore, onLoadMore]);

  // Set up scroll listener
  useEffect(() => {
    // Initial check
    checkIntersection();

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [checkIntersection, handleScroll]);

  return { containerRef };
}
