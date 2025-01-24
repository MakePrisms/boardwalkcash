import { useToast } from '@/hooks/util/useToast';
import { Badge, Spinner } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { formatSats } from '@/utils/formatting';

const NWCSidebarItem = () => {
   const user = useSelector((state: RootState) => state.user);
   const { disconnect, toggleSendMode, toggleReceiveMode } = useMintlessMode();
   const { addToast } = useToast();
   const { setNWCAsMain, nwcIsMain } = useCashuContext();
   const { getNwcBalance } = useMintlessMode();
   const [balance, setBalance] = useState<number | undefined>(undefined);

   useEffect(() => {
      getNwcBalance().then(setBalance);
   }, []);

   const connected = useMemo(() => !!user.nwcUri, [user.nwcUri]);
   if (!connected) return null;

   const handleSetMain = async () => {
      setNWCAsMain();
      addToast('Lightning Wallet set as main account', 'success');
   };

   const handleDisconnect = async () => {
      await disconnect();
      addToast('NWC disconnected', 'success');
   };

   const handleRefreshBalance = async () => {
      setBalance(undefined);
      const balance = await getNwcBalance();
      setBalance(balance);
   };

   return (
      <div className='flex flex-col justify-between min-w-full mb-5'>
         <div className='flex justify-between'>
            Lightning Wallet
            <Badge>{balance ? formatSats(balance) : <Spinner size='sm' />}</Badge>
         </div>
         <div className='flex justify-between align-middle min-w-max'>
            {/* <div className='flex space-x-4'>
               <button onClick={toggleReceiveMode} className='text-xs underline'>
               Receive: {user.receiveMode === 'mintless' ? '✅' : '❌'}
               </button>
               <button onClick={toggleSendMode} className='text-xs underline'>
                  Send: {user.sendMode === 'mintless' ? '✅' : '❌'}
               </button>
            </div> */}
            <div className='flex space-x-4'>
               {!nwcIsMain && (
                  <button onClick={handleSetMain} className='text-xs underline'>
                     Set Main
                  </button>
               )}
               <button onClick={handleDisconnect} className='text-xs underline'>
                  Disconnect
               </button>
            </div>
            <div className='flex justify-end space-x-2'>
               {nwcIsMain && (
                  <Badge className='ml-2' color='success'>
                     Main
                  </Badge>
               )}
               <Badge>{user.lud16}</Badge>
            </div>
         </div>
      </div>
   );
};

export default NWCSidebarItem;
