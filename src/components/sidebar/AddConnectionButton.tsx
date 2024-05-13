import { addNwcConnection } from '@/redux/slices/NwcSlice';
import { useAppDispatch } from '@/redux/store';
import { Wallet } from '@/types';
import { generateKeyPair } from '@/utils/crypto';
import { Button, Datepicker, Label, TextInput } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { NWCMethods } from '@/hooks/useNwc2';

interface AddConnectionButtonProps {
   keysets: { [key: string]: Wallet };
   nwcUri: string;
   setNwcUri: (uri: string) => void;
}

const AddConnectionButton = ({ keysets, nwcUri, setNwcUri }: AddConnectionButtonProps) => {
   const [activeWallet, setActiveWallet] = useState<Wallet | null>(null);
   const [appName, setAppName] = useState('');
   const [budget, setBudget] = useState('');
   const [expiry, setExpiry] = useState<string>('never');

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

      const budgetCents = budget ? parseFloat((parseFloat(budget) * 100).toFixed(2)) : undefined;

      const connection = {
         pubkey,
         appName,
         budget: budgetCents,
         expiry: Math.floor(new Date(expiry).getTime() / 1000),
         spent: 0,
         permissions: [NWCMethods.getInfo, NWCMethods.payInvoice, NWCMethods.getBalance],
         mintUrl,
         createdAt: Math.floor(Date.now() / 1000),
      };

      dispatch(
         addNwcConnection({
            connection,
            pubkey,
         }),
      );

      const newUri = `nostr+walletconnect://${window.localStorage.getItem('pubkey')}?relay=${encodeURIComponent('wss://relay.mutinywallet.com')}&secret=${privkey}&pubkey=${pubkey}`;

      setNwcUri(newUri);
   };

   return (
      <>
         <form onSubmit={handleSubmit}>
            <div className='flex flex-col justify-around space-y-3 ml-5'>
               <h3 className='text-black text-lg mb-2'>New Connection</h3>
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
                     minDate={new Date(new Date().getTime() + 24 * 60 * 60 * 1000)} // one day from now
                     value={expiry}
                     title='Connection Expiry Date'
                     showClearButton={false}
                     showTodayButton={false}
                     onSelectedDateChanged={date => setExpiry(date.toLocaleDateString())}
                  />

                  <p className='text-gray-500 text-sm'>
                     When the connection will expire.{' '}
                     {expiry !== 'never' && (
                        <button
                           className='underline text-gray-500 text-sm'
                           onClick={() => setExpiry('never')}
                        >
                           Reset
                        </button>
                     )}
                  </p>
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
