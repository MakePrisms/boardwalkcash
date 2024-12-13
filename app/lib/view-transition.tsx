// requires that view-transitions and animations are setup in in the app's tailwind.css
import { Link, NavLink, useLocation, useNavigation } from '@remix-run/react';
import { useEffect } from 'react';

type TransitionDirection = 'left' | 'right' | 'up' | 'down';
type TransitionType = 'open' | 'close';
type TransitionStyle = 'static' | 'dynamic';

// old page transitions out as new page transitions in
const DYNAMIC_ANIMATIONS: Record<
  TransitionDirection,
  { out: string; in: string }
> = {
  right: {
    out: 'slide-out-to-right',
    in: 'slide-in-from-left',
  },
  left: {
    out: 'slide-out-to-left',
    in: 'slide-in-from-right',
  },
  up: {
    out: 'slide-out-to-top',
    in: 'slide-in-from-bottom',
  },
  down: {
    out: 'slide-out-to-bottom',
    in: 'slide-in-from-top',
  },
} as const;

type StaticAnimation = {
  out: { animationName: string; zIndex: number };
  in: { animationName: string; zIndex: number };
};

// creates a more native-like transition
const STATIC_ANIMATIONS: Record<
  TransitionDirection,
  {
    open: StaticAnimation;
    close: StaticAnimation;
  }
> = {
  right: {
    open: {
      out: { animationName: 'none', zIndex: 0 },
      in: { animationName: 'slide-in-from-left', zIndex: 1 },
    },
    close: {
      out: { animationName: 'slide-out-to-right', zIndex: 1 },
      in: { animationName: 'none', zIndex: 0 },
    },
  },
  left: {
    open: {
      out: { animationName: 'none', zIndex: 0 },
      in: { animationName: 'slide-in-from-right', zIndex: 1 },
    },
    close: {
      out: { animationName: 'slide-out-to-left', zIndex: 1 },
      in: { animationName: 'none', zIndex: 0 },
    },
  },
  up: {
    open: {
      out: { animationName: 'none', zIndex: 0 },
      in: { animationName: 'slide-in-from-bottom', zIndex: 1 },
    },
    close: {
      out: { animationName: 'slide-out-to-top', zIndex: 1 },
      in: { animationName: 'none', zIndex: 0 },
    },
  },
  down: {
    open: {
      out: { animationName: 'none', zIndex: 0 },
      in: { animationName: 'slide-in-from-top', zIndex: 1 },
    },
    close: {
      out: { animationName: 'slide-out-to-bottom', zIndex: 1 },
      in: { animationName: 'none', zIndex: 0 },
    },
  },
} as const;

const getOppositeTransition = (
  direction: TransitionDirection,
  type: TransitionType,
): {
  transitionDirection: TransitionDirection;
  transitionType: TransitionType;
} => {
  const oppositeDirections = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
  } as const;

  const oppositeTypes = {
    open: 'close',
    close: 'open',
  } as const;

  return {
    transitionDirection: oppositeDirections[direction],
    transitionType: oppositeTypes[type],
  };
};

/**
 * Changes the direction of the animation for the view transition.
 */
function applyAnimationDirectionStyles(
  direction: TransitionDirection,
  type: TransitionType,
  style: TransitionStyle,
) {
  if (style === 'dynamic') {
    const animations = DYNAMIC_ANIMATIONS[direction];

    document.documentElement.style.setProperty(
      '--direction-out',
      animations.out,
    );
    document.documentElement.style.setProperty('--direction-in', animations.in);
  } else {
    const animations = STATIC_ANIMATIONS[direction][type];

    document.documentElement.style.setProperty(
      '--direction-out',
      animations.out.animationName,
    );
    document.documentElement.style.setProperty(
      '--view-transition-out-z-index',
      animations.out.zIndex.toString(),
    );
    document.documentElement.style.setProperty(
      '--direction-in',
      animations.in.animationName,
    );
    document.documentElement.style.setProperty(
      '--view-transition-in-z-index',
      animations.in.zIndex.toString(),
    );
  }
}

function removeAnimationDirectionStyles() {
  document.documentElement.style.removeProperty('--direction-out');
  document.documentElement.style.removeProperty('--direction-in');
  document.documentElement.style.removeProperty('--view-transition-in-z-index');
  document.documentElement.style.removeProperty(
    '--view-transition-out-z-index',
  );
}

type ViewTransitionState = {
  transitionDirection: TransitionDirection;
  transitionType: TransitionType;
  transitionStyle: TransitionStyle;
  previousPath: string; // so we can go back to the previous page
};

// location.state might be defined but set by someone else, so we need to check it
function validateViewTransitionState(state: ViewTransitionState | null) {
  if (
    typeof state === 'object' &&
    state !== null &&
    'transitionDirection' in state &&
    'transitionType' in state &&
    'transitionStyle' in state &&
    'previousPath' in state
  ) {
    return state as ViewTransitionState;
  }

  return null;
}

/**
 * Applies the animation direction styles based on the navigation state.
 * Must be used in the root component of the app.
 */
export function useViewTransitionEffect() {
  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === 'loading') {
      const state = validateViewTransitionState(navigation.location.state);
      if (!state) {
        return removeAnimationDirectionStyles();
      }

      console.error('STATE', state);

      const transitionDirection: TransitionDirection =
        state.transitionDirection;
      const transitionType: TransitionType = state.transitionType;
      const transitionStyle: TransitionStyle = state.transitionStyle;

      applyAnimationDirectionStyles(
        transitionDirection,
        transitionType,
        transitionStyle,
      );
    }
  }, [navigation]);
}

type ViewTransitionCommonProps = {
  back?: boolean;
  style?: TransitionStyle;
} & (
  | {
      back: true;
      direction?: never;
      type?: never;
      to?: never;
    }
  | {
      back?: false;
      direction: TransitionDirection;
      type: TransitionType;
      to: string;
    }
);

type ViewTransitionLinkProps = ViewTransitionCommonProps & {
  as?: typeof Link;
} & Omit<React.ComponentProps<typeof Link>, 'to'>;

type ViewTransitionNavLinkProps = ViewTransitionCommonProps & {
  as: typeof NavLink;
} & Omit<React.ComponentProps<typeof NavLink>, 'to'>;

/**
 * A wrapper around Link/NavLink that when used will animate the page transitions.
 *
 * Default is to prefetch the link when it is rendered to optimize the mobile experience,
 * but this can be overridden by setting the prefetch prop.
 *
 * Special case: when back=true, navigates to previous path with opposite animation.
 *
 * @param props - direction: 'left' | 'right' | 'up' | 'down', type: 'open' | 'close', style: 'static' | 'dynamic'
 */
export function ViewTransition<
  T extends ViewTransitionLinkProps | ViewTransitionNavLinkProps,
>({ direction, type, to, back, style = 'static', as = Link, ...props }: T) {
  const location = useLocation();

  const previousState = validateViewTransitionState(location.state);

  const linkState =
    back && previousState
      ? {
          previousPath: previousState.previousPath,
          transitionStyle: previousState.transitionStyle,
          ...getOppositeTransition(
            previousState.transitionDirection,
            previousState.transitionType,
          ),
        }
      : {
          previousPath: location.pathname,
          transitionDirection: direction,
          transitionType: type,
          transitionStyle: style,
        };

  const linkTo = back ? (previousState?.previousPath ?? '/') : to;

  const commonProps = {
    ...props,
    prefetch: props.prefetch ?? 'viewport',
    onClick: props.onClick,
    viewTransition: true,
    to: linkTo,
    state: linkState,
  };

  if (as === NavLink) {
    return (
      <NavLink {...(commonProps as React.ComponentProps<typeof NavLink>)} />
    );
  }

  return <Link {...(commonProps as React.ComponentProps<typeof Link>)} />;
}
