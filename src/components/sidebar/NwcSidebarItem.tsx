import { Button, Sidebar } from 'flowbite-react';
import { NwcConnection, deleteNwcConnection } from '@/redux/slices/NwcSlice';
import { useEffect } from 'react';
import { useAppDispatch } from '@/redux/store';

const NwcSidebarItem = ({ connection }: { connection: NwcConnection }) => {
   const dispatch = useAppDispatch();

   const handleDisconnect = () => {
      dispatch(deleteNwcConnection(connection.pubkey));
   };

   return (
      <>
         {connection && (
            <Sidebar.Item>
               <div className='text-black'>{connection.appName}</div>
               <Button size='small' color='failure' onClick={handleDisconnect}>
                  Disconnect
               </Button>
            </Sidebar.Item>
         )}
      </>
   );
};

export default NwcSidebarItem;
