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
import {
   postUserMintQuote,
   pollForInvoicePayment,
   getInvoiceForLNReceive,
   getInvoiceStatus,
} from '@/utils/appApiRequests';
import { getTokenFromUrl } from '@/utils/cashu';
import { WaitForInvoiceModalBody } from '../modals/WaitForInvoiceModal';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { Wallet } from '@/types';

const Receive = () => {
   const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
   const [inputValue, setInputValue] = useState('');
   const [invoiceToPay, setInvoiceToPay] = useState('');
   const [showEcashReceiveModal, setShowEcashReceiveModal] = useState(false);
   const [token, setToken] = useState<Token | null>(null);
   const [amountUnit, setAmountUnit] = useState<number | null>(null);
   const [currentPage, setCurrentPage] = useState<'input' | 'invoice'>('input');
   const [fetchingInvoice, setFetchingInvoice] = useState(false);
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [checkingId, setCheckingId] = useState<string | undefined>();

   const { decodeToken } = useCashu();
   const { activeWallet, activeUnit } = useCashuContext();
   const { mintlessReceive } = useMintlessMode();
   const { addToast } = useToast();
   const dispatch = useDispatch();
   const user = useSelector((state: RootState) => state.user);

   useEffect(() => {
      console.log('activeWallet', activeWallet);
      return () => {};
   }, [activeWallet]);

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
            switch (activeUnit) {
               case 'usd':
                  setAmountUnit(parsedAmount * 100);
                  break;
               case 'sat':
                  setAmountUnit(parsedAmount);
                  break;
               default:
                  throw new Error('Invalid unit');
            }
         } else {
            addToast('Invalid amount', 'error');
         }
      };

      const processInput = async () => {
         if (!inputValue) return;

         if (inputValue.includes('http') || inputValue.includes('cashu')) {
            handleTokenInput();
         } else if (!isNaN(parseFloat(inputValue))) {
            handleAmountInput();
         }
      };

      processInput();
   }, [inputValue]);

   const handleReceive = async () => {
      if (!activeWallet) {
         addToast('No active wallet found', 'error');
         return;
      }
      if (!amountUnit) {
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
         if (user.receiveMode === 'mintless') {
            if (activeUnit === 'usd') {
               addToast('Switch to BTC or disable mintless receive', 'error');
               throw new Error('Cannot receive mintless in usd mode');
            }
            console.log('using mintless mode');
            const invoice = await mintlessReceive(amountUnit);
            setInvoiceToPay(invoice);
            setCheckingId(undefined);
            setFetchingInvoice(false);
            setCurrentPage('invoice');
            return;
         }
         const { invoice, checkingId } = await getInvoiceForLNReceive(
            pubkey,
            amountUnit,
            activeWallet.keys.id,
         );
         setInvoiceToPay(invoice);
         setCheckingId(checkingId);
         setFetchingInvoice(false);

         setCurrentPage('invoice');

         waitForPayment(pubkey, checkingId, amountUnit, {
            url: activeWallet.mint.mintUrl,
            keys: activeWallet.keys,
            id: activeWallet.keys.id,
            proofs: [],
            isReserve: false,
            active: true,
         });
      } catch (error) {
         console.error('Error receiving ', error);
         handleModalClose();
      }
   };

   const waitForPayment = async (
      pubkey: string,
      checkingId: string,
      amountUsdCents: number,
      wallet: Wallet,
   ) => {
      let attempts = 0;
      const maxAttempts = 4;
      const interval = setInterval(async () => {
         const success = await checkPaymentStatus(pubkey, checkingId);
         if (success) {
            clearInterval(interval);
            handlePaymentSuccess(amountUsdCents, wallet, checkingId);
         }
         if (attempts >= maxAttempts) {
            clearInterval(interval);
            setInvoiceTimeout(true);
            return;
         } else {
            attempts++;
         }
         console.log('looking up payment for ', checkingId + '...');
      }, 5000);
   };

   const checkPaymentStatus = async (pubkey: string, checkingId: string) => {
      try {
         const statusResponse = await getInvoiceStatus(pubkey, checkingId);
         return statusResponse.paid;
      } catch (error) {
         console.error('Error fetching tip status', error);
         return false;
      }
   };

   const handlePaymentSuccess = (amountUsdCents: number, wallet: Wallet, quote: string) => {
      handleModalClose();
      addToast('Payment received!', 'success');
      dispatch(
         addTransaction({
            type: 'lightning',
            transaction: {
               amount: amountUsdCents,
               date: new Date().toLocaleString(),
               status: TxStatus.PAID,
               mint: wallet.url,
               quote,
               unit: activeUnit,
            },
         }),
      );
   };

   const handleModalClose = () => {
      setIsReceiveModalOpen(false);
      setInvoiceToPay('');
      setInputValue('');
      setAmountUnit(null);
      setShowEcashReceiveModal(false);
      setCurrentPage('input');
   };

   const handleCheckAgain = async () => {
      if (!checkingId || !amountUnit) throw new Error('Missing required parameters');
      setInvoiceTimeout(false);
      const pubkey = window.localStorage.getItem('pubkey');
      if (!pubkey) {
         throw new Error('No pubkey found');
      }
      if (!activeWallet) {
         throw new Error('No active wallet found');
      }
      const paid = await checkPaymentStatus(pubkey, checkingId);
      if (paid) {
         // TODO: get rid of `Wallet` type
         const wallet = {
            url: activeWallet.mint.mintUrl,
            keys: activeWallet.keys,
            id: activeWallet.keys.id,
            active: true,
         } as Wallet;
         handlePaymentSuccess(amountUnit, wallet, checkingId);
      } else {
         setInvoiceTimeout(true);
      }
   };

   return (
      <>
         <Button onClick={() => setIsReceiveModalOpen(true)} className='btn-primary'>
            <span className='text-lg'>Receive</span>{' '}
            <ArrowDownRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <Modal show={isReceiveModalOpen} onClose={handleModalClose}>
            <Modal.Header>
               {activeWallet?.keys.unit === 'usd' ? 'Receive $' : 'Receive Bitcoin'}
            </Modal.Header>
            <Modal.Body>
               {currentPage === 'input' ? (
                  <div className='space-y-6'>
                     <div className='relative'>
                        <textarea
                           className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
                           placeholder={`Paste token or enter amount in ${activeWallet?.keys.unit === 'usd' ? 'USD' : 'sats'}`}
                           value={inputValue}
                           onChange={e => setInputValue(e.target.value)}
                        />
                     </div>
                     <div className='flex items-center justify-between space-x-4'>
                        <QRScannerButton onScan={setInputValue} />
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
                  amountUnit &&
                  activeWallet && (
                     <WaitForInvoiceModalBody
                        invoice={invoiceToPay}
                        amount={amountUnit}
                        unit={activeUnit}
                        invoiceTimeout={invoiceTimeout}
                        onCheckAgain={handleCheckAgain}
                     />
                  )
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
