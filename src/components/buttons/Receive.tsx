import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'flowbite-react';
import { ArrowDownRightIcon } from '@heroicons/react/20/solid';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '@/hooks/util/useToast';
import { RootState } from '@/redux/store';
import ConfirmEcashReceiveModal from '@/components/modals/ConfirmEcashReceiveModal';
import { Token } from '@cashu/cashu-ts';
import QRScannerButton from './QRScannerButton';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu } from '@/hooks/cashu/useCashu';
import { postUserMintQuote, pollForInvoicePayment } from '@/utils/appApiRequests';
import { getTokenFromUrl } from '@/utils/cashu';
import { WaitForInvoiceModalBody } from '../modals/WaitForInvoiceModal';

const Receive = () => {
   const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
   const [inputValue, setInputValue] = useState('');
   const [invoiceToPay, setInvoiceToPay] = useState('');
   const [showEcashReceiveModal, setShowEcashReceiveModal] = useState(false);
   const [token, setToken] = useState<Token | null>(null);
   const [amountUsdCents, setAmountUsdCents] = useState<number | null>(null);
   const [currentPage, setCurrentPage] = useState<'input' | 'invoice'>('input');
   const [fetchingInvoice, setFetchingInvoice] = useState(false);

   const { requestMintInvoice, decodeToken } = useCashu();
   const { addToast } = useToast();
   const dispatch = useDispatch();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);

   /* process input every time the input value changes */
   useEffect(() => {
      const handleTokenInput = async () => {
         let decoded: Token | undefined = undefined;
         const encoded = inputValue.includes('http')
            ? await getTokenFromUrl(inputValue)
            : inputValue;
         if (encoded) {
            decoded = decodeToken(encoded);
         }
         if (decoded) {
            console.log('decoded', decoded);
            setToken(decoded);
            setShowEcashReceiveModal(true);
            setIsReceiveModalOpen(false);
         }
      };

      const handleAmountInput = () => {
         const parsedAmount = parseFloat(inputValue);
         if (!isNaN(parsedAmount)) {
            setAmountUsdCents(parsedAmount * 100);
         } else {
            addToast('Invalid amount' + parsedAmount + '' + inputValue, 'error');
         }
      };

      const processInput = async () => {
         if (!inputValue) return;

         if (inputValue.includes('http') || inputValue.includes('cashu')) {
            handleTokenInput();
         } else {
            handleAmountInput();
         }
      };

      processInput();
   }, [inputValue]);

   const handleReceive = async () => {
      const activeWallet = Object.values(wallets).find(w => w.active);
      if (!activeWallet) throw new Error('No active wallet is set');

      if (!amountUsdCents) {
         addToast('Please enter a valid amount.', 'warning');
         return;
      }

      const pubkey = window.localStorage.getItem('pubkey');

      if (!pubkey) {
         addToast('No pubkey found.', 'error');
         return;
      }

      try {
         setFetchingInvoice(true);
         const { quote, request } = await requestMintInvoice(amountUsdCents);
         setInvoiceToPay(request);
         setFetchingInvoice(false);

         await postUserMintQuote(pubkey, quote, request, activeWallet.url, activeWallet.id);

         setCurrentPage('invoice');

         waitForPayment(pubkey, quote, amountUsdCents, activeWallet.url, activeWallet.id);
      } catch (error) {
         console.error('Error receiving ', error);
         handleModalClose();
      }
   };

   const waitForPayment = async (
      pubkey: string,
      quote: string,
      amountUsdCents: number,
      mintUrl: string,
      walletId: string,
   ) => {
      try {
         const pollingResponse = await pollForInvoicePayment(
            pubkey,
            quote,
            amountUsdCents,
            mintUrl,
            walletId,
         );

         if (pollingResponse.success) {
            handlePaymentSuccess(amountUsdCents, mintUrl, quote);
         }
      } catch (error) {
         addToast('Error receiving', 'error');
         console.error('Error polling for invoice payment:', error);
      }
   };

   const handlePaymentSuccess = (amountUsdCents: number, mintUrl: string, quote: string) => {
      handleModalClose();
      addToast('Payment received!', 'success');
      dispatch(
         addTransaction({
            type: 'lightning',
            transaction: {
               amount: amountUsdCents,
               date: new Date().toLocaleString(),
               status: TxStatus.PAID,
               mint: mintUrl,
               quote,
            },
         }),
      );
   };

   const handleModalClose = () => {
      setIsReceiveModalOpen(false);
      setInvoiceToPay('');
      setInputValue('');
      setAmountUsdCents(null);
      setShowEcashReceiveModal(false);
      setCurrentPage('input');
   };

   const handleCheckAgain = async () => {};

   return (
      <>
         <Button onClick={() => setIsReceiveModalOpen(true)} className='btn-primary'>
            <span className='text-lg'>Receive</span>{' '}
            <ArrowDownRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <Modal show={isReceiveModalOpen} onClose={handleModalClose}>
            <Modal.Header>Receive</Modal.Header>
            <Modal.Body>
               {currentPage === 'input' ? (
                  <div className='space-y-6'>
                     <textarea
                        className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
                        placeholder='Paste token or enter amount USD (eg. 0.21)'
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                     />
                     <div className='flex items-center justify-between mx-3'>
                        <div className='mb-3 md:mb-0'>
                           <QRScannerButton onScan={setInputValue} />
                        </div>
                        <Button
                           isProcessing={fetchingInvoice}
                           className='btn-primary'
                           onClick={handleReceive}
                        >
                           Continue
                        </Button>
                     </div>
                  </div>
               ) : (
                  <WaitForInvoiceModalBody
                     invoice={invoiceToPay}
                     amountUsdCents={amountUsdCents || 0}
                     invoiceTimeout={false}
                     onCheckAgain={handleCheckAgain}
                  />
               )}
            </Modal.Body>
         </Modal>
         {token && (
            <ConfirmEcashReceiveModal
               isOpen={showEcashReceiveModal}
               onClose={handleModalClose}
               token={token}
               isUserInitialized={true}
            />
         )}
      </>
   );
};

export default Receive;
