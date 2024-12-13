// requires that view-transitions and animations are setup in in the app's tailwind.css
import {
  Link as RemixLink,
  useLocation,
  useNavigate as useRemixNavigate,
} from '@remix-run/react';
import { create } from 'zustand';

type AnimationDirection = 'left' | 'right' | 'up' | 'down';

interface HistoryStackItem {
  path: string;
  /** direction of the transition that created this item */
  direction: AnimationDirection;
}

interface TransitionHistoryStore {
  history: HistoryStackItem[];
  push: (entry: HistoryStackItem) => void;
  pop: () => HistoryStackItem | undefined;
  clear: () => void;
}

const useStore = create<TransitionHistoryStore>((set, get) => ({
  history: [],
  push: (entry) => set((state) => ({ history: [...state.history, entry] })),
  pop: () => {
    const current = get().history;
    if (current.length === 0) return undefined;
    const item = current[current.length - 1];
    set({ history: current.slice(0, -1) });
    return item;
  },
  clear: () => {
    set({ history: [] });
  },
}));

const DIRECTION_ANIMATIONS: Record<
  AnimationDirection,
  {
    out: string;
    in: string;
  }
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

const getOppositeDirection = (
  direction: AnimationDirection,
): AnimationDirection => {
  const opposites = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
  } as const;
  return opposites[direction];
};

/**
 * Changes the direction of the animation for the view transition.
 */
function applyAnimationDirectionStyles(direction: AnimationDirection) {
  const animations = DIRECTION_ANIMATIONS[direction];
  document.documentElement.style.setProperty('--direction-out', animations.out);
  document.documentElement.style.setProperty('--direction-in', animations.in);
}

/** a wrapper around useNavigate that will animate the page transitions */
function useViewTransition() {
  const navigate = useRemixNavigate();
  const location = useLocation();

  const {
    push: pushHistory,
    pop: popHistory,
    clear: clearHistory,
  } = useStore();

  const addCurrentLocationToHistory = (direction: AnimationDirection) => {
    pushHistory({ path: location.pathname, direction });
  };

  const goHome = () => {
    applyAnimationDirectionStyles('right');
    navigate('/', { viewTransition: true });
    clearHistory();
  };

  const goBack = () => {
    const previousView = popHistory();
    console.log('previousView', previousView);
    if (previousView) {
      const oppositeDirection = getOppositeDirection(previousView.direction);
      applyAnimationDirectionStyles(oppositeDirection);
      navigate(previousView.path, { viewTransition: true });
    } else {
      goHome();
    }
  };

  return {
    goBack,
    addCurrentLocationToHistory,
  };
}

interface ViewTransitionProps
  extends Omit<React.ComponentProps<typeof RemixLink>, 'to'> {
  direction?: AnimationDirection;
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
 * @param props - direction: 'left' | 'right' | 'up' | 'down'
 */
export function ViewTransition({
  direction = 'left',
  to,
  ...props
}: ViewTransitionProps) {
  const { goBack, addCurrentLocationToHistory } = useViewTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (to === 'back') {
      // prevent link from being followed directly
      e.preventDefault();
      goBack();
    } else {
      applyAnimationDirectionStyles(direction);
      addCurrentLocationToHistory(direction);
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
