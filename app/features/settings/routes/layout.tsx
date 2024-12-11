import { Outlet, useLocation } from '@remix-run/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sidebar, SidebarProvider } from '~/components/ui/sidebar';

export default function SettingsSidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 100);

    // Cleanup timeout on unmount
    return () => clearTimeout(timer);
  }, []);

  return (
    <SidebarProvider open={isOpen}>
      <Sidebar side="right">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0 } }}
            transition={{
              duration: 0.2,
              ease: 'easeInOut',
            }}
            className="absolute w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Sidebar>
    </SidebarProvider>
  );
}
