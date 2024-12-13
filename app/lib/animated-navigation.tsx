// requires that view-transitions and animations are setup in in the app's tailwind.css

import {
  Link as RemixLink,
  useNavigate as useRemixNavigate,
} from '@remix-run/react';
import { useEffect } from 'react';
import { create } from 'zustand';

type AnimationDirection = 'left' | 'right' | null;

interface AnimatedNavigationStore {
  direction: AnimationDirection;
  setDirection: (direction: AnimationDirection) => void;
}

const useStore = create<AnimatedNavigationStore>((set) => ({
  direction: null,
  setDirection: (direction) => set({ direction }),
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

interface AnimatedLinkProps extends React.ComponentProps<typeof RemixLink> {
  direction?: 'left' | 'right';
}

/**
 * A wrapper around Link that when used will animate the page transitions.
 *
 * Default is to prefetch the link when it is rendered to optimize the mobile experience,
 * but this can be overridden by setting the prefetch prop.
 *
 * @param props - direction: 'left' | 'right'
 */
export function AnimatedLink({
  direction = 'left',
  ...props
}: AnimatedLinkProps) {
  const setDirection = useStore((state) => state.setDirection);

  return (
    <RemixLink
      {...props}
      prefetch={props.prefetch ?? 'viewport'}
      onClick={(e) => {
        setDirection(direction);
        props.onClick?.(e);
      }}
      viewTransition
    />
  );
}

/** a wrapper around useNavigate that will animate the page transitions */
export function useAnimatedNavigate() {
  const navigate = useRemixNavigate();
  const setDirection = useStore((state) => state.setDirection);

  return (to: string, options?: { direction?: 'left' | 'right' }) => {
    setDirection(options?.direction ?? 'left');
    navigate(to);
  };
}
