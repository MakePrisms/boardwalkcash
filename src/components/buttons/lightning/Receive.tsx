import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Modal, Spinner, Tooltip } from 'flowbite-react';
import { ArrowDownRightIcon } from '@heroicons/react/20/solid';
import { useDispatch, useSelector } from 'react-redux';
import { resetStatus, setError, setSuccess } from '@/redux/slices/ActivitySlice';
import { useToast } from '@/hooks/useToast';
import { useCashu } from '@/hooks/useCashu';
import { assembleLightningAddress } from '@/utils/lud16';
import ClipboardButton from '../utility/ClipboardButton';
import QRCode from 'qrcode.react';
import { RootState } from '@/redux/store';
import ConfirmEcashReceiveModal from '@/components/modals/ConfirmEcashReceiveModal';
import { Token } from '@cashu/cashu-ts';
import QRScannerButton from '../QRScannerButton';
import { TxStatus, addTransaction, updateTransactionStatus } from '@/redux/slices/HistorySlice';

const Receive = () => {
   const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
   const [amount, setAmount] = useState('');
   const [isReceiving, setIsReceiving] = useState(false);
   const [invoiceToPay, setInvoiceToPay] = useState('');
   const [lightningAddress, setLightningAddress] = useState('');
   const [showEcashReceiveModal, setShowEcashReceiveModal] = useState(false);
   const [token, setToken] = useState<Token | null>(null);

   const { requestMintInvoice, decodeToken } = useCashu();
   const { addToast } = useToast();
   const dispatch = useDispatch();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);

   const getTokenFromUrl = (url: string) => {
      try {
         const urlObj = new URL(url);
         const params = new URLSearchParams(urlObj.search);
         const token = params.get('token');

         if (token && token.startsWith('cashu')) {
            return token;
         }

         return null;
      } catch (error) {
         console.error('Invalid URL:', error);
         return null;
      }
   };

   useEffect(() => {
      // timeout for the pubKey to be set in localStorage on first load
      setTimeout(() => {
         const storedPubkey = window.localStorage.getItem('pubkey');

         if (storedPubkey) {
            const host = window.location.host;
            setLightningAddress(assembleLightningAddress(storedPubkey, host));
         }
      }, 500);
   }, []);

   useEffect(() => {
      let decoded: Token | undefined = undefined;
      if (amount.includes('http')) {
         const encoded = getTokenFromUrl(amount);
         if (encoded) {
            decoded = decodeToken(encoded);
         }
      } else {
         decoded = decodeToken(amount.includes('Token:') ? amount.replace('Token:', '') : amount);
         console.log('decoded', decoded);
      }

      if (!decoded) return;

      console.log('decoded', decoded);

      setToken(decoded);
      setShowEcashReceiveModal(true);
      setIsReceiveModalOpen(false);
   }, [amount]);

   const handleReceive = async () => {
      const activeWallet = Object.values(wallets).find(w => w.active);
      if (!activeWallet) throw new Error('No active wallet is set');

      setIsReceiving(true);

      if (!amount) {
         addToast('Please enter an amount.', 'warning');
         setIsReceiving(false);
         return;
      }

      const amountUsdCents = parseFloat(amount) * 100;
      const pubkey = window.localStorage.getItem('pubkey');

      if (!pubkey) {
         addToast('No pubkey found.', 'error');
         setIsReceiving(false);
         return;
      }

      try {
         const { quote, request } = await requestMintInvoice(
            { unit: 'cent', amount: amountUsdCents },
            activeWallet,
         );
         setInvoiceToPay(request);

         await axios.post('/api/quotes/mint', {
            pubkey,
            quoteId: quote,
            request,
            keysetId: activeWallet.id,
            mintUrl: activeWallet.url,
         });

         // Add transaction to history as pending
         dispatch(
            addTransaction({
               type: 'lightning',
               transaction: {
                  amount: amountUsdCents,
                  date: new Date().toLocaleString(),
                  status: TxStatus.PENDING,
                  mint: activeWallet.url,
                  quote,
               },
            }),
         );

         const pollingResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${quote}`,
            {
               pubkey,
               amount: amountUsdCents,
               mintUrl: activeWallet.url,
               keysetId: activeWallet.id,
            },
         );

         if (pollingResponse.status === 200 && pollingResponse.data.success) {
            setIsReceiving(false);
            setIsReceiveModalOpen(false);
            setInvoiceToPay('');
            setAmount('');
            dispatch(setSuccess(`Received $${Number(amount).toFixed(2)}!`));
            dispatch(updateTransactionStatus({ type: 'lightning', quote, status: TxStatus.PAID }));
         }
      } catch (error) {
         console.error(error);
         dispatch(setError('An error occurred.'));
         dispatch(resetStatus());
      }
   };

   const handleModalClose = () => {
      setIsReceiveModalOpen(false);
      setInvoiceToPay('');
      setAmount('');
      setIsReceiving(false);
      setShowEcashReceiveModal(false);
   };

   return (
      <>
         <Button
            onClick={() => setIsReceiveModalOpen(true)}
            className='me-10 bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
         >
            <span className='text-lg'>Receive</span> <ArrowDownRightIcon className='ms-2 h-5 w-5' />
         </Button>
         <Modal show={isReceiveModalOpen} onClose={handleModalClose}>
            <Modal.Header>Receive</Modal.Header>
            {isReceiving && !invoiceToPay ? (
               <div className='flex justify-center items-center my-8'>
                  <Spinner size='xl' />
               </div>
            ) : (
               <>
                  <Modal.Body>
                     {invoiceToPay ? (
                        <div className='flex flex-col items-center justify-center space-y-4'>
                           <QRCode
                              value={`lightning:${invoiceToPay}`}
                              size={258}
                              level={'H'}
                              className='rounded-lg m-4 border-white border-2'
                           />
                           <ClipboardButton
                              toCopy={invoiceToPay}
                              toShow='Copy'
                              onClick={handleModalClose}
                           />
                        </div>
                     ) : (
                        <div className='space-y-6'>
                           <textarea
                              className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
                              placeholder='Paste token or enter amount USD (eg. 0.21)'
                              value={amount}
                              onChange={e => setAmount(e.target.value)}
                           />
                           <div className='flex flex-col items-center md:flex-row justify-around'>
                              <Button
                                 color='success'
                                 onClick={handleReceive}
                                 className='mb-4 md:mb-0'
                              >
                                 &nbsp;&nbsp;Generate Invoice&nbsp;
                              </Button>
                              <div className='mb-3 md:mb-0'>
                                 <QRScannerButton onScan={setAmount} />
                              </div>
                              <Tooltip content='Copy lightning address'>
                                 <ClipboardButton
                                    onClick={handleModalClose}
                                    toCopy={lightningAddress}
                                    toShow='Lightning Address'
                                 />
                              </Tooltip>
                           </div>
                        </div>
                     )}
                  </Modal.Body>
               </>
            )}
         </Modal>
         <ConfirmEcashReceiveModal
            isOpen={showEcashReceiveModal}
            onClose={handleModalClose}
            token={token}
         />
      </>
   );
};

export default Receive;
