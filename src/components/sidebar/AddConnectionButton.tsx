import { addNwcConnection } from '@/redux/slices/NwcSlice';
import { useAppDispatch } from '@/redux/store';
import { Wallet } from '@/types';
import { generateKeyPair } from '@/utils/crypto';
import { Button, Datepicker, Label, TextInput } from 'flowbite-react';
import { useEffect, useState } from 'react';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { NWCMethods } from '@/hooks/useNwc2';

const AddConnectionButton = ({ keysets }: { keysets: { [key: string]: Wallet } }) => {
   const [activeWallet, setActiveWallet] = useState<Wallet | null>(null);
   const [appName, setAppName] = useState('');
   const [budget, setBudget] = useState('');
   const [expiry, setExpiry] = useState<string>('never');
   const [nwcUri, setNwcUri] = useState('');

   const dispatch = useAppDispatch();

   useEffect(() => {
      const activeWallet = Object.values(keysets).find(wallet => wallet.active);

      setActiveWallet(activeWallet || null);
   }, [keysets]);

   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      let mintUrl = undefined;
      if (activeWallet) {
         mintUrl = activeWallet.url;
      }

      const { pubkey, privkey } = generateKeyPair();

      const connection = {
         pubkey,
         appName,
         budget: parseFloat(budget),
         expiry: Math.floor(new Date(expiry).getTime() / 1000),
         spent: 0,
         permissions: [NWCMethods.payInvoice],
         mintUrl,
         createdAt: Date.now(),
      };

      dispatch(
         addNwcConnection({
            connection,
            pubkey,
         }),
      );

      setNwcUri(
         `nostr+walletconnect://${window.localStorage.getItem('pubkey')}?relay=${encodeURIComponent('wss://relay.mutinywallet.com')}&secret=${privkey}&pubkey=${pubkey}`,
      );
   };

   if (nwcUri) {
      return (
         <div>
            <ClipboardButton toCopy={nwcUri} toShow={'Copy Wallet Connection'} />
         </div>
      );
   }

   return (
      <>
         <form onSubmit={handleSubmit}>
            <div className='flex flex-col justify-around space-y-3'>
               <h3 className='text-black text-lg mb-2'>Connect an App</h3>
               <div>
                  <Label>App Name</Label>
                  <TextInput
                     placeholder='My app'
                     value={appName}
                     onChange={e => setAppName(e.target.value)}
                     helperText='Identifier for your connection.'
                  />
               </div>
               <div>
                  <Label>Budget</Label>
                  <TextInput
                     type='number'
                     placeholder='Budget (eg. 0.21 USD)'
                     value={budget}
                     onChange={e => setBudget(e.target.value)}
                     helperText='Leave empty for unlimited budget.'
                  />
               </div>
               <div>
                  <Label>Expiry</Label>
                  <Datepicker
                     minDate={new Date()}
                     value={expiry}
                     onSelectedDateChanged={date => setExpiry(date.toLocaleDateString())}
                     helperText='When the connection will expire. Leave empty for never.'
                  />
               </div>
               <Button
                  className='max-w-fit bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none self-end'
                  type='submit'
               >
                  Connect
               </Button>
            </div>
         </form>
      </>
   );
};

export default AddConnectionButton;