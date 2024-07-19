import { useEffect } from 'react';

const useViewportHeight = () => {
   useEffect(() => {
      const setViewportHeight = () => {
         let vh = window.innerHeight * 0.01;
         document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      // Set the viewport height initially
      setViewportHeight();

      // Recalculate the viewport height on resize or orientation change
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);

      // Clean up event listeners on unmount
      return () => {
         window.removeEventListener('resize', setViewportHeight);
         window.removeEventListener('orientationchange', setViewportHeight);
      };
   }, []);
};

export default useViewportHeight;
