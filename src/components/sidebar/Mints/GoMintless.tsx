import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { RootState } from '@/redux/store';
import { nwc } from '@getalby/sdk';
import { Button, TextInput } from 'flowbite-react';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

const GoMintless = ({ onSuccess }: { onSuccess?: () => void }) => {
   const [nwcUri, setNwcUri] = useState('');
   const [lud16, setLud16] = useState('');
   const user = useSelector((state: RootState) => state.user);
   const { connect, disconnect, toggleSendMode, toggleReceiveMode } = useMintlessMode();

   const connected = useMemo(() => !!user.nwcUri, [user.nwcUri]);

   const resetFormState = () => {
      setNwcUri('');
      setLud16('');
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await connect(nwcUri, lud16);
      resetFormState();
      onSuccess && onSuccess();
   };

   const handleDisconnect = async () => {
      await disconnect();
      resetFormState();
   };

   const handleNwcInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nwcUri = e.target.value;
      setNwcUri(nwcUri);
      if (nwcUri.includes('lud16')) {
         const parsed = nwc.NWCClient.parseWalletConnectUrl(nwcUri);
         const lud16 = parsed.lud16;
         setLud16(lud16 || '');
      }
   };

   return (
      <>
         {
            !connected ? (
               <form className='flex flex-col justify-around mb-5' onSubmit={handleSubmit}>
                  <TextInput
                     placeholder='Nostr Wallet Connect URI'
                     value={nwcUri}
                     onChange={handleNwcInput}
                     className='mb-2'
                     required
                  />
                  <TextInput
                     placeholder='Lightning Address'
                     value={lud16}
                     onChange={e => setLud16(e.target.value)}
                     className='mb-2'
                     required
                  />
                  <Button className='btn-primary' type='submit'>
                     Submit
                  </Button>
               </form>
            ) : null
            // <div className='flex flex-col items-start space-y-5'>
            //    <div className='flex justify-between space-x-4 w-full'>
            //       <button onClick={toggleReceiveMode}>
            //          Receive: {user.receiveMode === 'mintless' ? '✅' : '❌'}
            //       </button>
            //       <button onClick={toggleSendMode}>
            //          Send: {user.sendMode === 'mintless' ? '✅' : '❌'}
            //       </button>
            //    </div>
            //    <div className='flex justify-between space-x-4 w-full'>
            //       <p>{user.lud16}</p>
            //       <Button
            //          color='failure'
            //          size='xs'
            //          onClick={handleDisconnect}
            //          className='xss-button !p-0'
            //       >
            //          Disconnect
            //       </Button>
            //    </div>
            // </div>
         }
      </>
   );
};

export default GoMintless;
