import { Button, Sidebar } from 'flowbite-react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid';
import { NwcConnection, deleteNwcConnection } from '@/redux/slices/NwcSlice';
import { useAppDispatch } from '@/redux/store';
import { useState } from 'react';

const NwcSidebarItem = ({ connection }: { connection: NwcConnection }) => {
   const [showDetails, setShowDetails] = useState(false);
   const dispatch = useAppDispatch();

   const handleDisconnect = () => {
      dispatch(deleteNwcConnection(connection.pubkey));
   };

   return (
      <>
         {connection && (
            <Sidebar.Item>
               <div className='text-black text-lg  mb-1 flex justify-between'>
                  <h4 className='flex underline'>
                     {connection.appName}{' '}
                     <button className='ml-2' onClick={() => setShowDetails(!showDetails)}>
                        {showDetails ? (
                           <EyeSlashIcon className='size-4' />
                        ) : (
                           <EyeIcon className='size-4' />
                        )}
                     </button>
                  </h4>
                  <Button
                     className='mt-1 text-sm'
                     size='small'
                     color='failure'
                     onClick={handleDisconnect}
                  >
                     Disconnect
                  </Button>
               </div>
               {showDetails && (
                  <>
                     <div className='text-black text-sm'>${connection.spent.toFixed(2)} spent</div>
                     <div className='text-black text-sm'>
                        {connection.budget
                           ? `$${(connection.budget - connection.spent).toFixed(2)} remaining`
                           : ''}
                     </div>
                     <div className='text-sm'>
                        Expires:{' '}
                        {connection.expiry
                           ? new Date(connection.expiry * 1000).toLocaleString().split(',')[0]
                           : 'never'}
                     </div>
                     <div className='text-black text-sm'>
                        Created:{' '}
                        {new Date(connection.createdAt * 1000).toLocaleString().split(',')[0]}
                     </div>
                  </>
               )}
            </Sidebar.Item>
         )}
      </>
   );
};

export default NwcSidebarItem;
