import { useEffect, useState } from 'react';
import { Modal, Spinner, Button } from 'flowbite-react';
import { useToast } from '@/hooks/util/useToast';
import { decodePaymentRequest, MeltQuoteResponse } from '@cashu/cashu-ts';
import { getInvoiceFromLightningAddress } from '@/utils/lud16';
import { RootState } from '@/redux/store';
import { useDispatch, useSelector } from 'react-redux';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import SendEcashModalBody from './SendEcashModalBody';
import QRScannerButton from '../buttons/QRScannerButton';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu } from '@/hooks/cashu/useCashu';
import { UserIcon } from '@heroicons/react/20/solid';
import ContactsModal from './ContactsModal/ContactsModal';
import { PublicContact } from '@/types';
import useNotifications from '@/hooks/boardwalk/useNotifications';
import GiftIcon from '../icons/GiftIcon';
import GiftModal from '../eGifts/GiftModal';
import { postTokenToDb } from '@/utils/appApiRequests';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { formatUnit } from '@/utils/formatting';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';

interface SendModalProps {
   isOpen: boolean;
   onClose: () => void;
}

enum SendFlow {
   Input = 'input',
   Amount = 'amount',
   Invoice = 'invoice',
   Ecash = 'ecash',
   PaymentRequest = 'paymentRequest',
   PaymentRequestAmount = 'paymentRequestAmtount',
}

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
   const [currentFlow, setCurrentFlow] = useState<SendFlow>(SendFlow.Input);
   const [inputValue, setInputValue] = useState('');
   const [amountUnit, setAmountUnit] = useState('');
   const [invoice, setInvoice] = useState('');
   const [meltQuote, setMeltQuote] = useState<MeltQuoteResponse | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
   const [scanError, setScanError] = useState<string | null>(null);
   const [ecashToken, setEcashToken] = useState<string | undefined>();
   const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
   const [lockTo, setLockTo] = useState<PublicContact | undefined>();
   const [txid, setTxid] = useState<string | undefined>(); // txid of the token used for mapping to the real token in the db
   const [paymentRequest, setPaymentRequest] = useState<string | undefined>();
   const [paymentRequestAmt, setPaymentRequestAmt] = useState<number | undefined>();
   const [isPayingRequest, setIsPayingRequest] = useState(false);
   const [paymentRequestUnit, setPaymentRequestUnit] = useState<string | undefined>(undefined);
   const { sendTokenAsNotification } = useNotifications();
   const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
   const { activeWallet, activeUnit } = useCashuContext();

   const { addToast } = useToast();
   const { createSendableToken, getMeltQuote, payInvoice } = useCashu();
   const { unitToSats } = useExchangeRate();
   const { nwcPayInvoice, createMintlessToken, sendToMintlessUser } = useMintlessMode();
   const { payPaymentRequest } = usePaymentRequests();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const user = useSelector((state: RootState) => state.user);
   const dispatch = useDispatch();

   const resetModalState = () => {
      setCurrentFlow(SendFlow.Input);
      setInputValue('');
      setAmountUnit('');
      setInvoice('');
      setMeltQuote(null);
      setEcashToken(undefined);
      setLockTo(undefined);
      setIsContactsModalOpen(false);
      setIsGiftModalOpen(false);
      setIsProcessing(false);
      setPaymentRequestAmt(undefined);
      setPaymentRequestUnit(undefined);
      onClose();
   };

   useEffect(() => {
      if (inputValue.includes('creqA') || inputValue.startsWith('lnbc')) {
         handleInputSubmit();
      }
   }, [inputValue]);

   const handleInputSubmit = async () => {
      if (!inputValue) {
         return;
      }

      if (inputValue.startsWith('lnbc')) {
         setInvoice(inputValue);
         await handleInvoiceFlow(inputValue);
      } else if (inputValue.startsWith('creqA')) {
         const request = decodePaymentRequest(inputValue);
         if (request.unit) {
            setPaymentRequestUnit(request.unit);
         }
         console.log('request', request);
         if (request.amount) {
            setPaymentRequestAmt(request.amount);

            setPaymentRequest(inputValue);
            setCurrentFlow(SendFlow.PaymentRequest);
         } else {
            setPaymentRequest(inputValue);
            setCurrentFlow(SendFlow.PaymentRequestAmount);
         }
      } else if (inputValue.includes('@')) {
         setCurrentFlow(SendFlow.Amount);
      } else if (!isNaN(parseFloat(inputValue))) {
         await handleEcashFlow(parseFloat(inputValue));
      } else {
         addToast('Invalid input. Please enter an amount, invoice, or lightning address.', 'error');
      }
   };

   const handleAmountSubmit = async () => {
      if (!amountUnit) {
         addToast('Please enter an amount.', 'warning');
         return;
      }
      if (!activeWallet && user.sendMode !== 'mintless') {
         addToast('No active wallet found', 'error');
         return;
      }

      setIsProcessing(true);
      try {
         const amountSats = await unitToSats(parseFloat(amountUnit), activeUnit);
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
      if (user.sendMode === 'mintless') {
         return handlePayInvoice(invoiceToProcess);
      }
      try {
         const quote = await getMeltQuote(invoiceToProcess);
         if (!quote) {
            throw new Error('Failed to get a melt quote');
         }
         setMeltQuote(quote);
         setAmountUnit((quote.amount + quote.fee_reserve).toString());
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
      setAmountUnit(amount.toString());
      setCurrentFlow(SendFlow.Ecash);
      const unit = activeUnit;
      const amountToSend = unit === 'usd' ? amount * 100 : amount;
      try {
         let token: string | undefined;
         if (user.sendMode === 'mintless' && !lockTo?.mintlessReceive) {
            /* if we are making a lightning payment to a user with a mint */
            if (!lockTo) {
               addToast('You can only send eTips and eGifts from a Lightning Wallet.', 'error');
               throw new Error('You can only send eTips and eGifts from a Lightning Wallet.');
            }
            if (unit !== 'sat') {
               throw new Error('mintless only supports sat');
            }

            token = await createMintlessToken(Math.round(amountToSend), unit, lockTo);
         } else if (lockTo?.mintlessReceive) {
            /* user wants to receive to their lud16 */
            return handleMintlessReceive(amountToSend, lockTo);
         } else {
            /* regular send */
            token = await createSendableToken(Math.round(amountToSend), {
               pubkey: lockTo ? `02${lockTo.pubkey}` : undefined,
            });
         }
         if (!token) {
            throw new Error('Failed to create ecash token');
         }
         setEcashToken(token);
         if (lockTo) {
            // send token to contact as notification
            // TODO: right now we don't support generic p2pk lock, but if lockTo is not a contact,
            // we should not do this.
            await sendTokenAsNotification(token);
            const txid = await postTokenToDb(token);
            setTxid(txid);
         }
      } catch (error: any) {
         console.error(error);
         resetModalState();
      }
   };

   const handleMintlessReceive = async (amountUnit: number, contact: PublicContact) => {
      console.log('mintless receive', contact);
      if (!contact.lud16) {
         addToast('Contact does not have a lightning address', 'error');
         return;
      }

      console.log('amountUnit', amountUnit);
      const transaction = await sendToMintlessUser(amountUnit, activeUnit, contact);
      resetModalState();
      console.log('transaction', transaction);
   };

   const handlePayInvoice = async (invoiceToPay?: string) => {
      if (user.sendMode === 'mintless' && invoiceToPay) {
         if (activeUnit === 'usd') {
            throw new Error('Cannot send to mintless in usd mode');
         }
         await nwcPayInvoice(invoiceToPay);
         return resetModalState();
      }
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
                     unit: activeUnit,
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
         /* wait for next tick */
         Promise.resolve().then(() => handleInputSubmit());
      } else if (decodedText.startsWith('creqA')) {
         setInputValue(decodedText);
         handleInputSubmit();
      } else {
         setScanError(
            'Invalid QR code. Please scan a valid Lightning invoice or payment request. Got ' +
               decodedText,
         );
         setTimeout(() => setScanError(null), 6000);
      }
   };

   const handleSendToUser = (contact: PublicContact) => {
      setIsContactsModalOpen(false);
      console.log('constact', contact);
      setLockTo(contact);
      // setInputValue(contact.lud16);
      // handleInputSubmit();
   };

   const handlePayPaymentRequest = async () => {
      if (!paymentRequestAmt || !paymentRequest) {
         addToast('Missing payment request or amount', 'error');
         return;
      }
      setIsPayingRequest(true);
      const res = await payPaymentRequest(paymentRequest, paymentRequestAmt).catch(e => {
         const message = e.message || 'Failed to pay payment request';
         addToast(message, 'error');
         setIsPayingRequest(false);
      });
      if (res) {
         setIsPayingRequest(false);
         addToast('Payment request paid', 'success');
         resetModalState();
      }
   };

   const handleSetPaymentRequestAmount = () => {
      if (!paymentRequestAmt) {
         addToast('Please enter an amount', 'error');
         return;
      }
      setCurrentFlow(SendFlow.PaymentRequest);
   };

   const renderFlowContent = () => {
      switch (currentFlow) {
         case SendFlow.Input:
            return (
               <Modal.Body>
                  <textarea
                     className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                     placeholder={
                        lockTo
                           ? `Amount in ${activeWallet?.keys.unit === 'usd' ? 'USD' : 'sats'} to ${lockTo.username}`
                           : `Amount in ${activeWallet?.keys.unit === 'usd' ? 'USD' : 'sats'}, Lightning address, or invoice`
                     }
                     value={inputValue}
                     onChange={e => {
                        const value = e.target.value;
                        setInputValue(value);
                     }}
                  />
                  {scanError && <p className='text-red-500 text-sm mb-3'>{scanError}</p>}
                  <div className='flex justify-between mx-3'>
                     <div className='flex flex-row gap-4'>
                        <QRScannerButton onScan={handleQRScan} />
                        <button onClick={() => setIsContactsModalOpen(true)}>
                           <UserIcon className='w-6 h-6 text-gray-500' />
                        </button>
                        <button onClick={() => setIsGiftModalOpen(true)}>
                           <GiftIcon className='w-6 h-6 text-gray-500' />
                        </button>
                     </div>
                     <Button className='btn-primary' onClick={handleInputSubmit}>
                        Continue
                     </Button>
                  </div>
               </Modal.Body>
            );

         case SendFlow.Amount:
            return (
               <Modal.Body>
                  <div className='mb-4'>
                     <label className='block text-sm font-medium text-gray-700 mb-2'>
                        {activeWallet?.keys.unit === 'usd' ? 'Send $' : 'Send Bitcoin'}
                     </label>
                     <input
                        className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
                        type='number'
                        placeholder={`Amount in ${activeUnit === 'usd' ? 'USD' : 'BTC'}`}
                        value={amountUnit}
                        onChange={e => setAmountUnit(e.target.value)}
                     />
                  </div>
                  <div className='flex justify-between mx-3'>
                     <Button color='failure' onClick={() => setCurrentFlow(SendFlow.Input)}>
                        Back
                     </Button>
                     <Button
                        className='btn-primary'
                        isProcessing={isProcessing}
                        onClick={handleAmountSubmit}
                     >
                        Continue
                     </Button>
                  </div>
               </Modal.Body>
            );

         case SendFlow.Invoice:
            return (
               <Modal.Body>
                  <div className='text-sm text-black mb-4'>
                     Estimated Fee: {formatUnit(meltQuote!.fee_reserve, activeUnit)}
                     <br />
                     Total amount to pay:
                     {formatUnit(meltQuote!.amount + meltQuote!.fee_reserve, activeUnit)}
                  </div>
                  <div className='flex items-center flex-row justify-between mx-3'>
                     {' '}
                     <Button color='failure' onClick={() => setCurrentFlow(SendFlow.Input)}>
                        Back
                     </Button>
                     <Button className='btn-primary' onClick={() => handlePayInvoice()}>
                        Pay
                     </Button>
                  </div>
               </Modal.Body>
            );

         case SendFlow.Ecash:
            return <SendEcashModalBody token={ecashToken} txid={txid} onClose={resetModalState} />;

         case SendFlow.PaymentRequest:
            return (
               <Modal.Body className='text-black flex flex-col justify-center items-center gap-6'>
                  <div>
                     Amount:{' '}
                     {paymentRequestAmt
                        ? formatUnit(paymentRequestAmt, paymentRequestUnit)
                        : 'any amount'}{' '}
                  </div>
                  <Button
                     isProcessing={isPayingRequest}
                     onClick={handlePayPaymentRequest}
                     className='btn-primary'
                  >
                     Confirm
                  </Button>
               </Modal.Body>
            );

         case SendFlow.PaymentRequestAmount:
            return (
               <Modal.Body>
                  <div className='mb-4'>
                     <input
                        className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
                        type='number'
                        placeholder={`Amount in ${activeUnit === 'usd' ? 'USD' : 'sats'}`}
                        value={paymentRequestAmt}
                        onChange={e => setPaymentRequestAmt(Number(e.target.value))}
                     />
                  </div>
                  <div className='flex justify-end'>
                     <Button className='btn-primary' onClick={handleSetPaymentRequestAmount}>
                        Continue
                     </Button>
                  </div>
               </Modal.Body>
            );

         default:
            return null;
      }
   };

   return (
      <>
         <Modal show={isOpen} onClose={resetModalState}>
            <Modal.Header>
               {!lockTo || currentFlow !== SendFlow.Ecash
                  ? activeUnit === 'usd'
                     ? 'Send $'
                     : 'Send Bitcoin'
                  : `eTip ${lockTo.username && 'for ' + lockTo.username}`}
            </Modal.Header>
            {isProcessing ? (
               <div className='flex justify-center items-center my-8'>
                  <Spinner size='xl' />
               </div>
            ) : (
               renderFlowContent()
            )}
         </Modal>
         <ContactsModal
            isOpen={isContactsModalOpen}
            onClose={() => setIsContactsModalOpen(false)}
            onSelectContact={handleSendToUser}
            mode='select'
         />
         <GiftModal isOpen={isGiftModalOpen} onClose={() => resetModalState()} />
      </>
   );
};
