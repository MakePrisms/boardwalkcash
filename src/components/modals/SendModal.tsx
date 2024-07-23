import { useState } from 'react';
import { Modal, Spinner, Button } from 'flowbite-react';
import { useToast } from '@/hooks/util/useToast';
import { MeltQuoteResponse } from '@cashu/cashu-ts';
import { getInvoiceFromLightningAddress } from '@/utils/lud16';
import { RootState } from '@/redux/store';
import { useDispatch, useSelector } from 'react-redux';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import SendEcashModalBody from './SendEcashModalBody';
import { getAmountFromInvoice } from '@/utils/bolt11';
import QRScannerButton from '../buttons/QRScannerButton';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu } from '@/hooks/cashu/useCashu';

interface SendModalProps {
   isOpen: boolean;
   onClose: () => void;
}

enum SendFlow {
   Input = 'input',
   Amount = 'amount',
   Invoice = 'invoice',
   Ecash = 'ecash',
}

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
   const [currentFlow, setCurrentFlow] = useState<SendFlow>(SendFlow.Input);
   const [inputValue, setInputValue] = useState('');
   const [amountUsd, setAmountUsd] = useState('');
   const [invoice, setInvoice] = useState('');
   const [meltQuote, setMeltQuote] = useState<MeltQuoteResponse | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
   const [scanError, setScanError] = useState<string | null>(null);
   const [ecashToken, setEcashToken] = useState<string | undefined>();

   const { addToast } = useToast();
   const { createSendableToken, getMeltQuote, payInvoice } = useCashu();
   const { unitToSats } = useExchangeRate();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const dispatch = useDispatch();

   const resetModalState = () => {
      setCurrentFlow(SendFlow.Input);
      setInputValue('');
      setAmountUsd('');
      setInvoice('');
      setMeltQuote(null);
      setEcashToken(undefined);
      onClose();
   };

   const handleInputSubmit = async () => {
      if (!inputValue) {
         addToast('Please enter a value.', 'warning');
         return;
      }

      if (inputValue.startsWith('lnbc')) {
         setInvoice(inputValue);
         await handleInvoiceFlow(inputValue);
      } else if (inputValue.includes('@')) {
         setCurrentFlow(SendFlow.Amount);
      } else if (!isNaN(parseFloat(inputValue))) {
         await handleEcashFlow(parseFloat(inputValue));
      } else {
         addToast('Invalid input. Please enter an amount, invoice, or lightning address.', 'error');
      }
   };

   const handleAmountSubmit = async () => {
      if (!amountUsd) {
         addToast('Please enter an amount.', 'warning');
         return;
      }

      setIsProcessing(true);
      try {
         const amountSats = await unitToSats(parseFloat(amountUsd), 'usd');
         const fetchedInvoice = await getInvoiceFromLightningAddress(inputValue, amountSats * 1000);
         setInvoice(fetchedInvoice);
         await handleInvoiceFlow(fetchedInvoice);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while fetching the invoice.', 'error');
      } finally {
         setIsProcessing(false);
      }
   };

   const handleInvoiceFlow = async (invoiceToProcess: string) => {
      setIsProcessing(true);
      try {
         const quote = await getMeltQuote(invoiceToProcess);
         if (!quote) {
            throw new Error('Failed to get a melt quote');
         }
         setMeltQuote(quote);
         setAmountUsd((quote.amount / 100).toFixed(2));
         setCurrentFlow(SendFlow.Invoice);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while processing the invoice.', 'error');
         resetModalState();
      } finally {
         setIsProcessing(false);
      }
   };

   const handleEcashFlow = async (amount: number) => {
      setAmountUsd(amount.toString());
      setCurrentFlow(SendFlow.Ecash);
      try {
         const token = await createSendableToken(Math.round(amount * 100));
         if (!token) {
            throw new Error('Failed to create ecash token');
         }
         setEcashToken(token);
      } catch (error) {
         console.error(error);
         addToast('An error occurred while creating the ecash token.', 'error');
         resetModalState();
      }
   };

   const handlePayInvoice = async () => {
      if (!meltQuote || !invoice) {
         resetModalState();
         throw new Error('Missing melt quote or invoice');
      }
      onClose();

      const activeWallet = Object.values(wallets).find(w => w.active);
      if (!activeWallet) throw new Error('No active wallet');

      try {
         const result = await payInvoice(invoice, meltQuote);
         if (result) {
            dispatch(
               addTransaction({
                  type: 'lightning',
                  transaction: {
                     amount: -meltQuote.amount,
                     unit: 'usd',
                     mint: activeWallet.url,
                     status: TxStatus.PAID,
                     date: new Date().toLocaleString(),
                     quote: meltQuote.quote,
                  },
               }),
            );
         }
      } catch (error) {
         console.error(error);
         addToast('An error occurred while paying the invoice.', 'error');
      }

      resetModalState();
   };

   const handleQRScan = (decodedText: string) => {
      const cleanedText = decodedText.toLowerCase().replace('lightning:', '');
      if (cleanedText.startsWith('lnbc')) {
         setInputValue(cleanedText);
         handleInputSubmit();
      } else {
         setScanError('Invalid QR code. Please scan a valid Lightning invoice.');
         setTimeout(() => setScanError(null), 6000);
      }
   };

   const renderFlowContent = () => {
      switch (currentFlow) {
         case SendFlow.Input:
            return (
               <Modal.Body>
                  <textarea
                     className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                     placeholder='Amount USD, Lightning address, or invoice'
                     value={inputValue}
                     onChange={e => setInputValue(e.target.value)}
                  />
                  {scanError && <p className='text-red-500 text-sm mb-3'>{scanError}</p>}
                  <div className='flex justify-between mx-3'>
                     <QRScannerButton onScan={handleQRScan} />
                     <Button color='info' onClick={handleInputSubmit}>
                        Continue
                     </Button>
                  </div>
               </Modal.Body>
            );

         case SendFlow.Amount:
            return (
               <Modal.Body>
                  <input
                     className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                     type='number'
                     placeholder='Amount in USD (eg. 0.21)'
                     value={amountUsd}
                     onChange={e => setAmountUsd(e.target.value)}
                  />
                  <div className='flex items-center flex-row justify-around'>
                     <Button color='failure' onClick={() => setCurrentFlow(SendFlow.Input)}>
                        Back
                     </Button>
                     <Button isProcessing={isProcessing} color='info' onClick={handleAmountSubmit}>
                        Continue
                     </Button>
                  </div>
               </Modal.Body>
            );

         case SendFlow.Invoice:
            return (
               <Modal.Body>
                  <div className='text-sm text-black mb-4'>
                     Estimated Fee: ${(meltQuote!.fee_reserve / 100).toFixed(2)}
                     <br />
                     Total amount to pay: $
                     {(parseFloat(amountUsd) + meltQuote!.fee_reserve / 100).toFixed(2)}
                  </div>
                  <div className='flex justify-around'>
                     <Button color='failure' onClick={() => setCurrentFlow(SendFlow.Input)}>
                        Back
                     </Button>
                     <Button color='success' onClick={handlePayInvoice}>
                        Pay
                     </Button>
                  </div>
               </Modal.Body>
            );

         case SendFlow.Ecash:
            return <SendEcashModalBody token={ecashToken} onClose={resetModalState} />;

         default:
            return null;
      }
   };

   return (
      <Modal show={isOpen} onClose={resetModalState}>
         <Modal.Header>Send</Modal.Header>
         {isProcessing ? (
            <div className='flex justify-center items-center my-8'>
               <Spinner size='xl' />
            </div>
         ) : (
            renderFlowContent()
         )}
      </Modal>
   );
};
