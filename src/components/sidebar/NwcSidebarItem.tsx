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
               <div className='text-black text-lg underline'>{connection.appName}</div>
               <div className='text-black'>Total spent: ${connection.spent.toFixed(2)}</div>
               <div className='text-black'>
                  Remaining Budget:{' '}
                  {connection.budget
                     ? `$${(connection.budget - connection.spent).toFixed(2)}`
                     : '∞'}
               </div>

               <div className='text-black max-w-fit whitespace-pre-wrap'>
                  Permissions: {connection.permissions.join(', ')}
               </div>
               <div>
                  Expiry:{' '}
                  {connection.expiry
                     ? new Date(connection.expiry * 1000).toLocaleString().split(',')[0]
                     : 'never'}
               </div>
               <div className='text-black'>
                  Created At: {new Date(connection.createdAt * 1000).toLocaleString().split(',')[0]}
               </div>
               <Button className='self-end' size='small' color='failure' onClick={handleDisconnect}>
                  Disconnect
               </Button>
            </Sidebar.Item>
         )}
      </>
   );
};

export default NwcSidebarItem;
