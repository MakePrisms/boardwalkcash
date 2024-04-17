import { useState } from 'react';
import { Modal, Spinner, Button } from 'flowbite-react';
import { useCashu } from '@/hooks/useCashu';
import { useToast } from '@/hooks/useToast';
import { CashuMint, CashuWallet, MeltQuoteResponse } from '@cashu/cashu-ts';
import { getInvoiceFromLightningAddress } from '@/utils/lud16';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface SendModalProps {
   isSendModalOpen: boolean;
   setIsSendModalOpen: (value: boolean) => void;
}

enum Tabs {
   Destination = 'destination',
   Amount = 'amount',
   Fee = 'fee',
   Send = 'send',
}

export const SendModal = ({ isSendModalOpen, setIsSendModalOpen }: SendModalProps) => {
   const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Destination);
   const [destination, setDestination] = useState('');
   const [amountSat, setAmountSat] = useState('');
   const [invoice, setInvoice] = useState('');
   const [isProcessing, setIsProcessing] = useState(false);
   const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
   const [meltQuote, setMeltQuote] = useState<MeltQuoteResponse | null>(null);

   const { addToast } = useToast();
   const { handlePayInvoice } = useCashu();
   const { unitToSats } = useExchangeRate();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);

   const resetModalState = () => {
      setCurrentTab(Tabs.Destination);
      setDestination('');
      setAmountSat('');
      setInvoice('');
      setEstimatedFee(null);
      setMeltQuote(null);
   };

   const handleBackClick = () => {
      if (currentTab === Tabs.Amount) {
         setCurrentTab(Tabs.Destination);
      } else if (currentTab === Tabs.Fee) {
         if (destination.startsWith('lnbc')) {
            setCurrentTab(Tabs.Destination);
         } else if (destination.includes('@')) {
            setCurrentTab(Tabs.Amount);
         }
      }
   };

   const estimateFee = async (invoice: string) => {
      const activeWallet = Object.values(wallets).find(w => w.active);
      if (!activeWallet) throw new Error('No active wallets');

      const wallet = new CashuWallet(new CashuMint(activeWallet.url), { ...activeWallet });

      try {
         const quote = await wallet.getMeltQuote(invoice);

         setMeltQuote(quote);

         setEstimatedFee(quote.fee_reserve);
         addToast(`Estimated fee: ${quote.fee_reserve} sats`, 'info');
         setCurrentTab(Tabs.Fee);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while estimating the fee.', 'error');
      } finally {
         setIsProcessing(false);
      }
   };

   const handleSend = async () => {
      if (!meltQuote) {
         resetModalState();
         throw new Error('Failed to get a melt quote');
      }
      setIsSendModalOpen(false);

      const activeWallet = Object.values(wallets).find(w => w.active);
      if (!activeWallet) throw new Error('no active wallet');

      try {
         await handlePayInvoice(invoice, meltQuote, estimatedFee as number, activeWallet);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while paying the invoice.', 'error');
      }

      // reset modal state
      setCurrentTab(Tabs.Destination);
      setDestination('');
      setInvoice('');
      setEstimatedFee(null);
   };

   const handleLightningAddress = async () => {
      if (!amountSat) {
         addToast('Please enter an amount.', 'warning');
         return;
      }

      try {
         const satsFromUsd = await unitToSats(parseFloat(amountSat), 'usd');
         const invoice = await getInvoiceFromLightningAddress(destination, satsFromUsd * 1000);
         setInvoice(invoice);
         await estimateFee(invoice);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while fetching the invoice.', 'error');
      }
   };

   const handleDestination = async () => {
      if (!destination) {
         addToast('Please enter a destination.', 'warning');
         return;
      }

      if (destination.startsWith('lnbc')) {
         setInvoice(destination);
         await estimateFee(destination);
         setCurrentTab(Tabs.Fee);
      } else if (destination.includes('@')) {
         setCurrentTab(Tabs.Amount);
      }
   };

   const renderTab = () => {
      switch (currentTab) {
         case Tabs.Destination:
            return (
               <>
                  <Modal.Body>
                     <input
                        className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                        type='text'
                        placeholder='Lightning address or invoice'
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                     />
                     <div className='flex justify-end'>
                        <Button color='info' onClick={handleDestination}>
                           Continue
                        </Button>
                     </div>
                  </Modal.Body>
               </>
            );

         case Tabs.Amount:
            return (
               <Modal.Body>
                  <input
                     className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                     type='number'
                     placeholder='Amount in USD (eg. 0.21)'
                     value={amountSat || ''}
                     onChange={e => setAmountSat(() => e.target.value)}
                  />
                  <div className='flex items-center flex-row justify-around'>
                     <Button color='failure' onClick={handleBackClick}>
                        Back
                     </Button>
                     <Button color='info' onClick={handleLightningAddress}>
                        Continue
                     </Button>
                  </div>
               </Modal.Body>
            );

         case Tabs.Fee:
            return (
               <Modal.Body>
                  <div className=' text-sm text-black mb-4'>
                     Estimated Fee: ${estimatedFee}
                     <br />
                     Total amount to pay: ${parseFloat(amountSat) + estimatedFee!}
                  </div>
                  <div className='flex justify-around'>
                     <Button color='failure' onClick={handleBackClick}>
                        Back
                     </Button>
                     <Button color='success' onClick={handleSend}>
                        Pay
                     </Button>
                  </div>
               </Modal.Body>
            );

         case Tabs.Send:
            return (
               <div className='flex justify-center items-center my-8'>
                  <Spinner size='xl' />
               </div>
            );

         default:
            return null;
      }
   };

   return (
      <Modal show={isSendModalOpen} onClose={() => setIsSendModalOpen(false)}>
         <Modal.Header>Send</Modal.Header>
         {isProcessing ? (
            <div className='flex justify-center items-center my-8'>
               <Spinner size='xl' />
            </div>
         ) : (
            renderTab()
         )}
      </Modal>
   );
};
