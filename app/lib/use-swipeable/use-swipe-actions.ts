import { useState } from 'react';
import { useSwipeable } from './use-swipeable';

type UseSwipeActionsProps = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

type SwipeState = {
  offset: number;
  isTransitioning: boolean;
  swipeHandlers: ReturnType<typeof useSwipeable>;
};

/**
 * This hook is used to add swipe actions to a component.
 * It is a wrapper around the useSwipeable hook.
 *
 * @returns
 * - offset: The offset of the component from the LEFT edge of the screen.
 * - isTransitioning: Whether the component is transitioning.
 * - swipeHandlers: The swipe handlers that should be passed to the component.
 *
 * @example
 * ```tsx
 * const { offset, isTransitioning, swipeHandlers } = useSwipeActions({
 *   onSwipeLeft: () => {},
 *   onSwipeRight: () => {},
 * });
 *
 * <div {...swipeHandlers}>
 *   This div will be swipable.
 * </div>
 * ```
 */
export const useSwipeActions = ({
  onSwipeLeft,
  onSwipeRight,
}: UseSwipeActionsProps): SwipeState => {
  const [offset, setOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const resetSwipe = () => {
    setIsTransitioning(true);
    setOffset(0);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      if (Math.abs(e.deltaX) < 15) {
        return;
      }
      if (!isTransitioning) {
        setOffset(e.deltaX);
      }
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > 150) {
        onSwipeLeft();
      }
      resetSwipe();
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > 150) {
        onSwipeRight();
      }
      resetSwipe();
    },
    onTouchEndOrOnMouseUp: () => {
      resetSwipe();
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  return {
    offset,
    isTransitioning,
    swipeHandlers,
  };
};
