import React, { useState, useEffect } from 'react';
import { Button, Drawer, Modal } from 'flowbite-react';
import { ArrowDownRightIcon } from '@heroicons/react/20/solid';
import XMarkIcon from '@/components/icons/XMarkIcon';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '@/hooks/util/useToast';
import { RootState } from '@/redux/store';
import ConfirmEcashReceiveModal from '@/components/modals/ConfirmEcashReceiveModal';
import { Token } from '@cashu/cashu-ts';
import PaymentRequestQRButton from '../PaymentRequestQRButton';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu } from '@/hooks/cashu/useCashu';
import { getInvoiceForLNReceive, getInvoiceStatus } from '@/utils/appApiRequests';
import { getTokenFromUrl } from '@/utils/cashu';
import { WaitForInvoiceModalBody } from '../../modals/WaitForInvoiceModal';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { Wallet } from '@/types';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import Tooltip from '../../utility/Toolttip';
import Numpad from '../../utility/Numpad';
import { customDrawerTheme } from '@/themes/drawerTheme';
import { Tabs } from '../../utility/Tabs';
import Amount from '../../utility/amounts/Amount';
import QRScannerButton from '../QRScannerButton';
import PasteButton from '../utility/PasteButton';
import ToggleCurrencyDropdown from '../../ToggleCurrencyDropdown';
import { useNumpad } from '@/hooks/util/useNumpad';
import ReceiveButtonContent from './ReceiveButtonContent';

const ReceiveButton = ({ isMobile }: { isMobile: boolean }) => {
   const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
   const [pastedValue, setPastedValue] = useState('');
   pastedValue;
   const [invoiceToPay, setInvoiceToPay] = useState('');
   const [showEcashReceiveModal, setShowEcashReceiveModal] = useState(false);
   const [token, setToken] = useState<Token | null>(null);
   const [amountUnit, setAmountUnit] = useState<number | null>(null);
   const [currentPage, setCurrentPage] = useState<'input' | 'invoice'>('input');
   const [fetchingInvoice, setFetchingInvoice] = useState(false);
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [checkingId, setCheckingId] = useState<string | undefined>();
   const [fetchingPaymentRequest, setFetchingPaymentRequest] = useState(false);
   const [paymentRequest, setPaymentRequest] = useState<string | undefined>();
   const [paymentRequestId, setPaymentRequestId] = useState<string | undefined>();
   const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
   const [activeTab, setActiveTab] = useState<'ecash' | 'bitcoin'>('ecash');
   const { decodeToken } = useCashu();
   const { activeWallet, activeUnit } = useCashuContext();
   const { mintlessReceive, isMintless } = useMintlessMode();
   const { fetchPaymentRequest } = usePaymentRequests();
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
         const encoded = pastedValue.includes('http')
            ? await getTokenFromUrl(pastedValue)
            : pastedValue;
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
         const parsedAmount = parseFloat(pastedValue);
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
         if (!pastedValue) return;

         if (pastedValue.includes('http') || pastedValue.includes('cashu')) {
            handleTokenInput();
         } else if (!isNaN(parseFloat(pastedValue))) {
            handleAmountInput();
         }
      };

      processInput();
   }, [pastedValue, activeUnit]);

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

   const handleReceivePaymentRequest = async () => {
      setFetchingPaymentRequest(true);

      const { pr, id } = await fetchPaymentRequest(amountUnit || undefined, false).catch(e => {
         handleModalClose();
         addToast('Failed to fetch payment request', 'error');
         throw e;
      });

      setFetchingPaymentRequest(false);

      setPaymentRequest(pr);
      setPaymentRequestId(id);
      setShowPaymentRequestModal(true);
   };

   const onPaymentRequestSuccess = (token: string) => {
      addToast('Payment received! Check your notifications for the token', 'success');
      handleModalClose();
   };

   const handleModalClose = () => {
      setIsReceiveModalOpen(false);
      setInvoiceToPay('');
      setPastedValue('');
      setAmountUnit(null);
      setShowEcashReceiveModal(false);
      setCurrentPage('input');
      setFetchingInvoice(false);
      setFetchingPaymentRequest(false);
      setShowEcashReceiveModal(false);
      setShowPaymentRequestModal(false);
   };

   return (
      <>
         <Button onClick={() => setIsReceiveModalOpen(true)} className='btn-primary'>
            <span className='text-lg'>Receive</span>{' '}
            <ArrowDownRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         {isMobile ? (
            <div>
               <Drawer
                  open={isReceiveModalOpen}
                  onClose={handleModalClose}
                  position='bottom'
                  className='h-[90vh] md:h-5/6'
               >
                  <Drawer.Header
                     title={activeWallet?.keys.unit === 'usd' ? 'Receive $' : 'Receive Bitcoin'}
                     titleIcon={() => null}
                     closeIcon={() => <XMarkIcon className='h-8 w-8' />}
                  />
                  <Drawer.Items className='flex flex-col h-[78vh]'>
                     {isReceiveModalOpen && (
                        <ReceiveButtonContent
                           isMobile={isMobile}
                           closeParentComponent={handleModalClose}
                        />
                     )}
                  </Drawer.Items>
               </Drawer>
            </div>
         ) : (
            <Modal show={isReceiveModalOpen} onClose={handleModalClose} size={'sm'}>
               <Modal.Header>
                  {activeWallet?.keys.unit === 'usd' ? 'Receive $' : 'Receive Bitcoin'}
               </Modal.Header>
               <Modal.Body>
                  {/* {currentPage === 'input' ? (
                     <div className='flex flex-col space-y-12 justify-center items-center'>
                        <Tabs
                           titleColor='text-black'
                           titles={['ecash', 'bitcoin']}
                           onActiveTabChange={tab => setActiveTab(tab === 0 ? 'ecash' : 'bitcoin')}
                           className='w-full'
                        />

                        <div className='flex-grow flex flex-col items-center justify-center'>
                           <Amount
                              value={numpadValue}
                              unit={activeUnit}
                              className='font-teko text-6xl font-bold text-black'
                           />
                           <ToggleCurrencyDropdown className='text-black mt-2' />
                        </div>

                        <div className='mb-8 w-1/2'>
                           <div className='flex justify-between mb-4'>
                              <div className='flex space-x-4'>
                                 <PasteButton onPaste={setInputValue} />
                                 <QRScannerButton onScan={setInputValue} />
                                 <PaymentRequestQRButton onClick={handleModalClose} />
                              </div>
                              {isMintless && activeTab === 'ecash' ? (
                                 <Tooltip
                                    position='left'
                                    content='You currently have a Lightning Wallet set as your main account. Select an eCash mint as your main account to generate an eCash request.'
                                    className='w-56'
                                 >
                                    <Button className='btn-primary' disabled={true}>
                                       Continue
                                    </Button>
                                 </Tooltip>
                              ) : (
                                 <Button
                                    className='btn-primary'
                                    onClick={
                                       activeTab === 'ecash'
                                          ? handleReceivePaymentRequest
                                          : handleReceive
                                    }
                                    disabled={inputValue === ''}
                                    isProcessing={
                                       activeTab === 'ecash'
                                          ? fetchingPaymentRequest
                                          : fetchingInvoice
                                    }
                                 >
                                    Continue
                                 </Button>
                              )}
                           </div>
                           <Numpad
                              onNumberClick={handleNumpadInput}
                              onBackspaceClick={handleNumpadBackspace}
                           />
                        </div>
                     </div>
                  ) : (
                     amountUnit &&
                     activeWallet &&
                     !isMobile && (
                        <WaitForInvoiceModalBody
                           invoice={invoiceToPay}
                           invoiceTimeout={invoiceTimeout}
                           onCheckAgain={handleCheckAgain}
                        />
                     )
                  )} */}
                  <div className='flex flex-col space-y-20 items-stretch justify-center'>
                     {isReceiveModalOpen && (
                        <ReceiveButtonContent
                           isMobile={isMobile}
                           closeParentComponent={handleModalClose}
                        />
                     )}
                  </div>
               </Modal.Body>
            </Modal>
         )}
         {token && !isMobile && (
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

export default ReceiveButton;
