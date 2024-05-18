import { useRef, useState } from 'react';
import { Modal, Spinner, Button } from 'flowbite-react';
import { QrCodeIcon } from '@heroicons/react/20/solid';
import { useCashu } from '@/hooks/useCashu';
import { useToast } from '@/hooks/useToast';
import { CashuMint, CashuWallet, MeltQuoteResponse, Proof } from '@cashu/cashu-ts';
import { getInvoiceFromLightningAddress } from '@/utils/lud16';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import SendEcashModalBody from './SendEcashModalBody';
import QrReaderComponent from '../QRReader';
import { getAmountFromInvoice } from '@/utils/bolt11';

interface SendModalProps {
   isSendModalOpen: boolean;
   setIsSendModalOpen: (value: boolean) => void;
}

enum Tabs {
   Destination = 'destination',
   Amount = 'amount',
   Fee = 'fee',
   Send = 'send',
   Ecash = 'ecash',
}

export const SendModal = ({ isSendModalOpen, setIsSendModalOpen }: SendModalProps) => {
   const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Destination);
   const [destination, setDestination] = useState('');
   const [amountSat, setAmountSat] = useState('');
   const [invoice, setInvoice] = useState('');
   const [isProcessing, setIsProcessing] = useState(false);
   const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
   const [meltQuote, setMeltQuote] = useState<MeltQuoteResponse | null>(null);
   const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);
   const [showQRScanner, setShowQRScanner] = useState(false);
   const [scanError, setScanError] = useState<string | null>(null);
   const qrReaderRef = useRef<any>(null);

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
      setIsSendModalOpen(false);
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

      const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
      const activeBalance = proofs.reduce((acc: number, proof: Proof) => {
         if (proof.id === activeWallet.id) {
            acc += proof.amount;
         }
         return acc;
      }, 0);

      const wallet = new CashuWallet(new CashuMint(activeWallet.url), { ...activeWallet });

      try {
         const quote = await wallet.getMeltQuote(invoice);

         if (activeBalance < quote.fee_reserve + quote.amount) {
            addToast(
               'Insufficient balance to pay the invoice. If you have funds on another mint, please swap them to your main mint.',
               'error',
            );
            resetModalState();
            return;
         }

         setMeltQuote(quote);

         setAmountSat((quote.amount / 100).toFixed(2));
         setEstimatedFee(quote.fee_reserve);
         addToast(`Estimated fee: ${quote.fee_reserve} sats`, 'info');
         setCurrentTab(Tabs.Fee);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while estimating the fee.', 'error');
         resetModalState();
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
      resetModalState();
   };

   const handleQRResult = (decodedText: string) => {
      if (decodedText.toLowerCase().includes('lightning:')) {
         setDestination(decodedText.toLowerCase().split('lightning:')[1]);
         handleDestination(decodedText.toLowerCase().split('lightning:')[1]);
      } else if (decodedText.toLowerCase().includes('lnbc')) {
         setDestination(decodedText.toLowerCase());
         handleDestination(decodedText.toLowerCase());
      } else {
         setScanError('Invalid QR code. Please scan a valid Lightning invoice.');
         setTimeout(() => {
            setScanError(null);
         }, 6000);
      }
      setShowQRScanner(false);
   };

   const handleLightningAddress = async () => {
      if (!amountSat) {
         addToast('Please enter an amount.', 'warning');
         return;
      }

      try {
         setIsFetchingInvoice(true);
         const satsFromUsd = await unitToSats(parseFloat(amountSat), 'usd');
         const invoice = await getInvoiceFromLightningAddress(destination, satsFromUsd * 1000);
         setInvoice(invoice);
         await estimateFee(invoice);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while fetching the invoice.', 'error');
      } finally {
         setIsFetchingInvoice(false);
      }
   };

   const handleDestination = async (invoice?: string) => {
      if (invoice) {
         const amount = getAmountFromInvoice(invoice);

         if (isNaN(amount)) {
            setScanError('Invoice must have an amount.');
            setTimeout(() => {
               setScanError(null);
            }, 6000);
            return;
         }

         setInvoice(invoice);
         await estimateFee(invoice);
         setCurrentTab(Tabs.Fee);
         return;
      }

      if (!destination) {
         addToast('Please enter a destination.', 'warning');
         return;
      }

      if (destination.startsWith('lnbc')) {
         const amount = getAmountFromInvoice(destination);

         if (isNaN(amount)) {
            setScanError('Invoice must have an amount.');
            setTimeout(() => {
               setScanError(null);
            }, 6000);
            return;
         }

         setInvoice(destination);
         await estimateFee(destination);
         setCurrentTab(Tabs.Fee);
      } else if (destination.includes('@')) {
         setCurrentTab(Tabs.Amount);
      } else if (!isNaN(parseFloat(destination))) {
         console.log('AMount entered as destination');
         setAmountSat(destination);
         setCurrentTab(Tabs.Ecash);
      }
   };

   const handleSendEcash = async () => {
      console.log('Resetting modal state');
      resetModalState();
   };

   const renderTab = () => {
      switch (currentTab) {
         case Tabs.Destination:
            return (
               <>
                  <Modal.Body>
                     <textarea
                        className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                        placeholder='Amount USD, Lightning address, or invoice'
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                     />
                     {scanError && <p className='text-red-500 text-sm mb-3'>{scanError}</p>}
                     <div className='flex justify-between mx-3'>
                        <button
                           onClick={() => {
                              setShowQRScanner(true);
                              setDestination('');
                           }}
                        >
                           <QrCodeIcon className='text-gray-500 size-8 p-0 m-0' />
                        </button>

                        <Button color='info' onClick={() => handleDestination()}>
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
                     <Button
                        isProcessing={isFetchingInvoice}
                        color='info'
                        onClick={handleLightningAddress}
                     >
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

         case Tabs.Ecash:
            return <SendEcashModalBody amountUsd={parseFloat(destination) * 100} />;

         default:
            return null;
      }
   };

   return (
      <>
         <Modal show={isSendModalOpen} onClose={resetModalState}>
            <Modal.Header>Send</Modal.Header>
            {isProcessing ? (
               <div className='flex justify-center items-center my-8'>
                  <Spinner size='xl' />
               </div>
            ) : (
               renderTab()
            )}
         </Modal>
         <Modal show={showQRScanner} onClose={() => setShowQRScanner(false)}>
            <Modal.Header>Scan QR Code</Modal.Header>
            <Modal.Body>
               <QrReaderComponent ref={qrReaderRef} onDecode={handleQRResult} />
            </Modal.Body>
            <Modal.Footer>
               <Button
                  onClick={() => {
                     setShowQRScanner(false);
                     qrReaderRef.current.stopScanner();
                  }}
               >
                  Close
               </Button>
            </Modal.Footer>
         </Modal>
      </>
   );
};
