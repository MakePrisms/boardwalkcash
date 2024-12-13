// requires that view-transitions and animations are setup in in the app's tailwind.css

import {
  Link as RemixLink,
  useLocation,
  useNavigate as useRemixNavigate,
} from '@remix-run/react';
import { useEffect } from 'react';
import { create } from 'zustand';

type AnimationDirection = 'left' | 'right' | null;

interface AnimatedNavigationStore {
  direction: AnimationDirection;
  history: string[];
  setDirection: (direction: AnimationDirection) => void;
  addToHistory: (path: string) => void;
  popHistory: () => void;
}

const useStore = create<AnimatedNavigationStore>((set) => ({
  direction: null,
  setDirection: (direction) => set({ direction }),
  history: [],
  addToHistory: (path) =>
    set((state) => ({ history: [...state.history, path] })),
  popHistory: () => set((state) => ({ history: state.history.slice(0, -1) })),
}));

const DIRECTION_ANIMATIONS: Record<
  NonNullable<AnimationDirection>,
  {
    out: string;
    in: string;
  }
> = {
  right: {
    out: 'slideOutToRight',
    in: 'slideInFromLeft',
  },
  left: {
    out: 'slideOutToLeft',
    in: 'slideInFromRight',
  },
} as const;

/** wrap the app with this to apply the styles based on direction*/
export function AnimatedNavigationProvider({
  children,
}: { children: React.ReactNode }) {
  const direction = useStore((state) => state.direction);

  useEffect(() => {
    if (direction) {
      const animations = DIRECTION_ANIMATIONS[direction];
      document.documentElement.style.setProperty(
        '--direction-out',
        animations.out,
      );
      document.documentElement.style.setProperty(
        '--direction-in',
        animations.in,
      );
    }
  }, [direction]);

  return children;
}
interface AnimatedLinkProps
  extends Omit<React.ComponentProps<typeof RemixLink>, 'to'> {
  direction?: 'left' | 'right';
  to: string | 'back';
}

/**
 * A wrapper around Link that when used will animate the page transitions.
 *
 * Default is to prefetch the link when it is rendered to optimize the mobile experience,
 * but this can be overridden by setting the prefetch prop.
 *
 * Special case: when `to="back"` is used, it will navigate back in the history stack
 * with the appropriate animation direction.
 *
 * @param props - direction: 'left' | 'right'
 */
export function AnimatedLink({
  direction = 'left',
  to,
  ...props
}: AnimatedLinkProps) {
  const { goBack, setDirection, addCurrentLocationToHistory } =
    useAnimatedNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (to === 'back') {
      // prevent link from being followed directly
      e.preventDefault();
      goBack(direction);
    } else {
      setDirection(direction);
      addCurrentLocationToHistory();
    }
    props.onClick?.(e);
  };

  return (
    <RemixLink
      {...props}
      prefetch={props.prefetch ?? 'viewport'}
      onClick={handleClick}
      viewTransition
      to={to}
    />
  );
}

/** a wrapper around useNavigate that will animate the page transitions */
export function useAnimatedNavigate() {
  const navigate = useRemixNavigate();
  const location = useLocation();
  const setDirection = useStore((state) => state.setDirection);
  const addToHistory = useStore((state) => state.addToHistory);
  const popHistory = useStore((state) => state.popHistory);
  const history = useStore((state) => state.history);

  const addCurrentLocationToHistory = () => {
    addToHistory(location.pathname);
  };

  const animatedNavigate = (
    to: string,
    options?: { direction?: 'left' | 'right' },
  ) => {
    setDirection(options?.direction ?? 'left');
    addCurrentLocationToHistory();
    navigate(to);
  };

  const goBack = (direction: NonNullable<AnimationDirection>) => {
    setDirection(direction);
    if (history.length > 0) {
      const lastPath = history[history.length - 1];
      popHistory();
      navigate(lastPath, { viewTransition: true });
    } else {
      navigate('/', { viewTransition: true });
    }
  };

  // QUESTION: should we only export goBack and goForward instead of allowng animatedNavigate to be called? This would
  // make it easer to enforce the history.
  return {
    navigate: animatedNavigate,
    goBack,
    setDirection,
    addCurrentLocationToHistory,
  };
}
