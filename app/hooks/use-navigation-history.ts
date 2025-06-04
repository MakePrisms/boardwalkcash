import { To, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback

export type NavigationEntry = {
  pathname: string;
  search: string;
  hash: string;
  state?: any;
};

// Updated getNavigationEntry to be more flexible
const locationToEntry = (
  location: Pick<ReturnType<typeof useLocation>, 'pathname' | 'search' | 'hash'>,
  state?: any,
): NavigationEntry => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
  state: state ?? {}, // Ensure state is always an object
});

const toToEntry = (
  to: To,
  currentState?: any, // Current state of the page we are on, if needed
  navOptionsState?: any // State provided in navigate(to, {state: navOptionsState})
): NavigationEntry => {
  if (typeof to === 'string') {
    // Simple path string
    const url = new URL(to, window.location.origin); // Use a base for proper parsing
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      state: { ...navOptionsState } // State comes from navigation options
    };
  }
  // 'to' is a Path object
  return {
    pathname: to.pathname ?? '/', // Default to '/' if pathname is somehow undefined
    search: to.search ?? '',
    hash: to.hash ?? '',
    state: { ...navOptionsState } // State comes from navigation options
  };
};


const entryToTo = (entry: NavigationEntry): To => ({
    pathname: entry.pathname,
    search: entry.search,
    hash: entry.hash,
});

export const useNavigationHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initializeStack = (): NavigationEntry[] => {
    if (location.state?.historyStack && Array.isArray(location.state.historyStack)) {
      return location.state.historyStack;
    }
    return [locationToEntry(location, location.state)];
  };

  const [historyStack, setHistoryStack] = useState<NavigationEntry[]>(initializeStack);

  const push = useCallback((to: To, options?: { replace?: boolean; state?: any }) => {
    const newEntry = toToEntry(to, location.state, options?.state);
    const newHistoryStack = options?.replace
        ? [...historyStack.slice(0, -1), newEntry]
        : [...historyStack, newEntry];

    const browserState = { ...newEntry.state, historyStack: newHistoryStack };

    navigate(to, { replace: options?.replace, state: browserState });
    setHistoryStack(newHistoryStack);
  }, [navigate, historyStack, location.state]); // Added location.state to dependencies

  const pop = useCallback(() => {
    if (historyStack.length <= 1) {
      console.log("Cannot pop the last entry from history stack.");
      return;
    }

    const newStack = historyStack.slice(0, -1);
    const targetEntry = newStack[newStack.length - 1];

    // The state for the browser should be the state of the targetEntry, plus the new (shorter) history stack
    const browserState = { ...targetEntry.state, historyStack: newStack };

    navigate(entryToTo(targetEntry), { replace: true, state: browserState });
    setHistoryStack(newStack);
  }, [navigate, historyStack]);

  useEffect(() => {
    // This effect syncs the component's historyStack with the one from browser's location state
    // This is crucial for handling browser back/forward buttons correctly.
    const browserHistoryStack = location.state?.historyStack;
    if (browserHistoryStack && Array.isArray(browserHistoryStack)) {
      // Only update if stacks are actually different to avoid infinite loops
      if (JSON.stringify(historyStack) !== JSON.stringify(browserHistoryStack)) {
        setHistoryStack(browserHistoryStack);
      }
    } else {
      // If no historyStack in browser state, means we're at a state not managed by our hook,
      // or it's the very first load. Reset our stack to the current location.
      // This also handles manual URL changes.
      const currentEntry = locationToEntry(location, location.state);
      if (historyStack.length > 1 || JSON.stringify(historyStack[0]) !== JSON.stringify(currentEntry)) {
         // Only reset if it's meaningfully different or stack is longer than it should be
        setHistoryStack([currentEntry]);
      }
    }
  }, [location, historyStack]); // Removed navigate from here, it doesn't directly influence this sync logic

  const canGoBack = historyStack.length > 1;

  return { historyStack, push, pop, canGoBack };
};
