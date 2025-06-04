import { useEffect } from 'react';
import { useNavigationHistory } from './use-navigation-history';

export const useCustomBackButton = () => {
  const { pop, canGoBack } = useNavigationHistory();

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // We need to prevent the default browser back navigation
      // and use our custom `pop` function if we can go back.
      // The `PopStateEvent` is triggered by browser's back/forward buttons.
      // Our `useNavigationHistory`'s useEffect already tries to sync the historyStack
      // if `location.state.historyStack` is present.
      // The main job here is to ensure that if `canGoBack` is true,
      // we prefer our `pop` logic.

      // event.preventDefault(); // This is not directly possible in onpopstate in a reliable way.
      // Instead, the logic in useNavigationHistory's useEffect for location changes
      // should correctly interpret the state and adjust the historyStack.
      // What we want to ensure is that a "browser back" action correctly
      // triggers our `pop` if the previous state in our stack is the target.

      // The current `useNavigationHistory` `useEffect` should handle synchronization.
      // Let's test if simply relying on that is enough.
      // If not, we might need to explicitly call `pop()` here under certain conditions,
      // for example, if the new location (after browser back) matches what `pop()` would navigate to.

      // For now, this effect will primarily be a placeholder to remind us
      // that this is where explicit back button handling logic would go if needed.
      // The actual stack management on popstate is currently handled by the
      // useEffect in useNavigationHistory.

      // Let's add a log to see when this is triggered.
      console.log('PopStateEvent triggered', event.state, window.location.pathname);

      // One potential strategy:
      // If `event.state` does NOT contain our `historyStack`, it means it's a navigation
      // outside our custom history system's full control (e.g. very first page, or user manually changed URL).
      // In this case, `useNavigationHistory`'s `useEffect` should reset the stack.
      // If `event.state` DOES contain `historyStack`, `useNavigationHistory`'s `useEffect`
      // should already sync to it. Our `pop` function also updates the state with the new stack.
      // The key is that when the user clicks "back", the browser goes to the *previous state object*.
      // If that previous state object was set by our `push` or `pop` method, it contains the
      // correct `historyStack` for that point in time.
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pop, canGoBack]); // Dependencies for the effect

  // Potentially, we can expose a function to be called by a UI back button.
  const goBack = () => {
    if (canGoBack) {
      pop();
    } else {
      // Optional: Handle case where there's no place to go back in the custom stack
      // e.g., navigate to a default page or exit app (if in a PWA context)
      console.log("Cannot go back further in custom history.");
    }
  };

  return { goBack, canGoBack };
};
