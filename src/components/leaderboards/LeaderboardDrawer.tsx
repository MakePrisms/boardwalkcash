import { Drawer } from 'flowbite-react';
import { customDrawerTheme } from '@/themes/drawerTheme';
import XMarkIcon from '@/components/icons/XMarkIcon';
import ViewLeaderboardData from './ViewLeaderboardData';

interface LeaderboardDrawerProps {
   isOpen: boolean;
   onClose: () => void;
}

const LeaderboardDrawer = ({ isOpen, onClose }: LeaderboardDrawerProps) => {
   return (
      <>
         <Drawer
            open={isOpen}
            onClose={onClose}
            edge={false}
            position='right'
            className='h-full bg-[#0f1f41ff] text-white flex flex-col md:min-w-fit min-w-full'
            theme={customDrawerTheme}
         >
            <Drawer.Header
               className='drawer-header'
               title='Leaderboard'
               titleIcon={() => null}
               closeIcon={() => <XMarkIcon className='h-8 w-8' />}
            />
            <Drawer.Items className='flex-grow'>
               <div className='flex flex-col h-full'>
                  <ViewLeaderboardData />
               </div>
            </Drawer.Items>
            <div className='h-16 bg-[#0f1f41ff]'></div>
         </Drawer>
      </>
   );
};

export default LeaderboardDrawer;
