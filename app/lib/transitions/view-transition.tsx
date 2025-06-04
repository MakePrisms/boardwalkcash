import type {
  ComponentProps,
  HTMLAttributes,
  PropsWithChildren,
} from 'react';
import { useEffect } from 'react';
import {
  Link,
  NavLink,
  type To,
  useNavigation,
  type NavigateOptions,
} from 'react-router-dom'; // Assuming react-router-dom is used
import { useNavigationHistory, type NavigationEntry } from '~/hooks/use-navigation-history';
import { useNavigate as useReactRouterNavigate } from 'react-router'; // Alias original navigate


// --- Constants for transition types and application ---
export const ANIMATIONS = {
  fade: { class: 'fade', duration: 300 },
  slide: { class: 'slide', duration: 500 },
  pop: { class: 'pop', duration: 400 },
  // Add more predefined animations here
} as const;

export type Transition = keyof typeof ANIMATIONS | AnimationDefinition;
export type ApplyTo = 'newView' | 'oldView' | 'bothViews';

export type AnimationDefinition = {
  class: string;
  duration: number; // in ms
};

export type ViewTransitionState = {
  transition: Transition;
  applyTo?: ApplyTo;
};

// --- Helper functions ---
const getAnimation = (transition: Transition): AnimationDefinition => {
  return typeof transition === 'string'
    ? ANIMATIONS[transition]
    : transition;
};

const applyTransitionStyles = (
  transition: Transition,
  applyTo: ApplyTo = 'bothViews',
) => {
  const animation = getAnimation(transition);
  const newView = document.querySelector(
    '[data-view-transition="new"]',
  ) as HTMLElement | null;
  const oldView = document.querySelector(
    '[data-view-transition="old"]',
  ) as HTMLElement | null;

  if (newView && (applyTo === 'newView' || applyTo === 'bothViews')) {
    newView.classList.add(animation.class);
    newView.style.setProperty('--animation-duration', `${animation.duration}ms`);
  }
  if (oldView && (applyTo === 'oldView' || applyTo === 'bothViews')) {
    oldView.classList.add(animation.class);
    oldView.style.setProperty('--animation-duration', `${animation.duration}ms`);
  }
};

const removeTransitionStyles = () => {
  Object.values(ANIMATIONS).forEach((anim) => {
    document
      .querySelectorAll(`.${anim.class}`)
      .forEach((el) => el.classList.remove(anim.class));
  });
  document
    .querySelectorAll('[style*="--animation-duration"]')
    .forEach((el) => (el as HTMLElement).style.removeProperty('--animation-duration'));
};

// Function to extract transition state from location.state
// Needs to be robust to varying state structures.
const getViewTransitionState = (
  locationState: unknown,
): ViewTransitionState | null => {
  if (
    locationState &&
    typeof locationState === 'object' &&
    'transition' in locationState
  ) {
    const state = locationState as Partial<ViewTransitionState>;
    if (state.transition) {
      return {
        transition: state.transition,
        applyTo: state.applyTo || 'bothViews',
      };
    }
  }
  return null;
};


// --- Hooks ---
export function useViewTransitionEffect() {
  const navigation = useNavigation(); // from react-router
  const { historyStack } = useNavigationHistory(); // Get history stack

  useEffect(() => {
    if (navigation.state === 'loading' && navigation.location) {
      // The view transition state should be on the incoming location's state
      const locationState = navigation.location.state as NavigationEntry['state'];
      const transitionState = getViewTransitionState(locationState);

      console.debug('Navigation state from location: ', transitionState);
      if (transitionState) {
        applyTransitionStyles(transitionState.transition, transitionState.applyTo);
      } else {
        removeTransitionStyles();
      }
    }
  }, [navigation, historyStack]); // Add historyStack to dependencies if it influences transitions
}

// --- Components ---
type BaseLinkProps =
  | ComponentProps<typeof Link>
  | ComponentProps<typeof NavLink>;

export type ViewTransitionLinkProps = BaseLinkProps &
  ViewTransitionState & {
    as?: typeof Link;
  };

export type ViewTransitionNavLinkProps = BaseLinkProps &
  ViewTransitionState & {
    as: typeof NavLink;
  };

export function LinkWithViewTransition<
  T extends ViewTransitionLinkProps | ViewTransitionNavLinkProps,
>({ transition, applyTo = 'bothViews', as = Link, ...props }: T) {
  const { push } = useNavigationHistory();

  // We need to override the default navigation behavior to use our `push`
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (props.onClick) {
      props.onClick(event); // Call original onClick if it exists
    }
    if (!event.defaultPrevented) {
      event.preventDefault(); // Prevent default link navigation

      const viewTransitionState = { transition, applyTo };
      // Props.to can be a string or a To object.
      // Props.state is the existing state from the Link component.
      // We merge our viewTransitionState into it.
      push(props.to, { replace: props.replace, state: { ...props.state, ...viewTransitionState } });
    }
  };

  const commonProps: HTMLAttributes<HTMLAnchorElement> & { to: To } = {
    ...props,
    onClick: handleClick,
  } as any; // Type assertion needed due to complex props manipulation

  // Remove props that are handled by our push or are not standard Link props
  // These were identified as potentially problematic in the prompt.
  delete (commonProps as any).viewTransition; // if react-router's own VT prop exists
  delete (commonProps as any).state; // state is now handled by our push
  delete (commonProps as any).transition; // our own prop, not for underlying Link
  delete (commonProps as any).applyTo; // our own prop, not for underlying Link


  if (as === NavLink) {
    return <NavLink {...(commonProps as ComponentProps<typeof NavLink>)} />;
  }
  return <Link {...(commonProps as ComponentProps<typeof Link>)} />;
}


// --- Navigation function ---
// Options for the navigate function, extending react-router's NavigateOptions
// and adding our custom transition state.
type NavigateWithViewTransitionOptions = Omit<NavigateOptions, 'state'> & ViewTransitionState & { state?: any };

export function useNavigateWithViewTransition() {
  const { push } = useNavigationHistory();
  // const originalNavigate = useReactRouterNavigate(); // keep access to original for non-stack ops if needed

  return (
    to: To,
    {
      transition,
      applyTo = 'bothViews',
      state, // User-provided state
      ...options // Other react-router navigate options (replace, etc.)
    }: NavigateWithViewTransitionOptions,
  ) => {
    const viewTransitionState = { transition, applyTo };
    // Combine user state with our transition state
    const combinedState = { ...state, ...viewTransitionState };

    push(to, { ...options, state: combinedState });
  };
}

export const transitionStyles = `
/* Fade Animation */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
[data-view-transition="new"].fade {
  animation: fade-in var(--animation-duration, 0.3s) ease-out;
}
[data-view-transition="old"].fade {
  animation: fade-out var(--animation-duration, 0.3s) ease-out;
}

/* Slide Animation */
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
@keyframes slide-out-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

/* Default slide: new view slides in from right, old slides out to left */
[data-view-transition="new"].slide {
  animation: slide-in-right var(--animation-duration, 0.5s) forwards;
}
[data-view-transition="old"].slide {
  animation: slide-out-left var(--animation-duration, 0.5s) forwards;
}
/* Example for reverse: new view slides in from left, old slides out to right */
/* You might need a way to specify direction in transition state */
[data-view-transition="new"].slide-reverse {
  animation: slide-in-left var(--animation-duration, 0.5s) forwards;
}
[data-view-transition="old"].slide-reverse {
  animation: slide-out-right var(--animation-duration, 0.5s) forwards;
}


/* Pop Animation */
@keyframes pop-in {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes pop-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.8); opacity: 0; }
}
[data-view-transition="new"].pop {
  animation: pop-in var(--animation-duration, 0.4s) ease-out;
}
[data-view-transition="old"].pop {
  animation: pop-out var(--animation-duration, 0.4s) ease-out;
}

/* Ensure views are positioned correctly during transition */
[data-view-transition-group] {
  position: relative;
  overflow: hidden; /* Prevent scrollbars during transition if content overflows */
}

[data-view-transition-group] > * {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: center center; /* For scale/pop animations */
}

/* Initial states for views - old view is visible, new view is hidden initially */
/* This might need adjustment based on how react-router handles view rendering */
/* It's often better to let react-router manage adding/removing views from DOM */
/* and use animations that don't rely on absolute positioning of both all the time */

/* A simpler approach: only animate the incoming/outgoing view, not both fixed */
/* This requires the router to replace the content of a stable container */
/*
[data-view-transition="new"] {
  animation-fill-mode: forwards;
}
[data-view-transition="old"] {
  animation-fill-mode: forwards;
}
*/
`;
