// creates wrappers around useNavigate and Link from @remix-run/react
// to add animated navigation

import {
  Link as RemixLink,
  useNavigate as useRemixNavigate,
} from '@remix-run/react';
import { createContext, useContext, useEffect, useState } from 'react';

type AnimationDirection = 'left' | 'right' | null;

interface AnimatedNavigationContextType {
  setDirection: (direction: AnimationDirection) => void;
  direction: AnimationDirection;
}

const AnimatedNavigationContext =
  createContext<AnimatedNavigationContextType | null>(null);

export function AnimatedNavigationProvider({
  children,
}: { children: React.ReactNode }) {
  const [direction, setDirection] = useState<AnimationDirection>(null);

  useEffect(() => {
    // these animations are defined in app/tailwind.css
    if (direction === 'right') {
      document.documentElement.style.setProperty(
        '--direction-out',
        'slideOutToRight',
      );
      document.documentElement.style.setProperty(
        '--direction-in',
        'slideInFromLeft',
      );
    } else if (direction === 'left') {
      document.documentElement.style.setProperty(
        '--direction-out',
        'slideOutToLeft',
      );
      document.documentElement.style.setProperty(
        '--direction-in',
        'slideInFromRight',
      );
    }
  }, [direction]);

  return (
    <AnimatedNavigationContext.Provider value={{ direction, setDirection }}>
      {children}
    </AnimatedNavigationContext.Provider>
  );
}

export function useAnimatedNavigation() {
  const context = useContext(AnimatedNavigationContext);
  if (!context) {
    throw new Error(
      'useAnimatedNavigation must be used within AnimatedNavigationProvider',
    );
  }
  return context;
}

interface AnimatedLinkProps extends React.ComponentProps<typeof RemixLink> {
  direction?: 'left' | 'right';
}

export function AnimatedLink({
  direction = 'left',
  ...props
}: AnimatedLinkProps) {
  const { setDirection } = useAnimatedNavigation();

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

export function useAnimatedNavigate() {
  const navigate = useRemixNavigate();
  const { setDirection } = useAnimatedNavigation();

  return (to: string, options?: { direction?: 'left' | 'right' }) => {
    setDirection(options?.direction ?? 'left');
    navigate(to);
  };
}
