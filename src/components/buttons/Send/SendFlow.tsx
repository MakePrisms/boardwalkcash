import { decodePaymentRequest, MeltQuoteResponse, PaymentRequest } from '@cashu/cashu-ts';
import PaymentConfirmationDetails from '@/components/views/PaymentConfirmationDetails';
import ConfrimAndSendLightning from '@/components/views/ConfirmAndSendLightning';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import ConfirmSendGift from '@/components/views/ConfirmSendGift';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { GiftIcon, UserIcon } from '@heroicons/react/20/solid';
import { getInvoiceFromLightningAddress } from '@/utils/lud16';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { Currency, GiftAsset, PublicContact } from '@/types';
import SelectContact from '@/components/views/SelectContact';
import Amount from '@/components/utility/amounts/Amount';
import ShareEcash from '@/components/views/ShareEcash';
import SelectGift from '@/components/views/SelectGift';
import { getAmountFromInvoice } from '@/utils/bolt11';
import QRScanner from '@/components/views/QRScanner';
import ScanIcon from '@/components/icons/ScanIcon';
import Tooltip from '@/components/utility/Tooltip';
import { useNumpad } from '@/hooks/util/useNumpad';
import { Button, TextInput } from 'flowbite-react';
import useWallet from '@/hooks/boardwalk/useWallet';
import { shortenString } from '@/utils/formatting';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import { Tabs } from '@/components/utility/Tabs';
import PasteButton from '../utility/PasteButton';
import Numpad from '@/components/utility/Numpad';
import { useState } from 'react';

const SendFlow = ({
   isMobile,
   closeParentComponent,
}: {
   isMobile: boolean;
   closeParentComponent: () => void;
}) => {
   const [activeInputTab, setActiveInputTab] = useState<'ecash' | 'lightning'>('ecash');
   const [currentView, setCurrentView] = useState<
      | 'confirmPaymentRequest'
      | 'confirmSendGift'
      | 'sendLightning'
      | 'selectContact'
      | 'selectGift'
      | 'shareEcash'
      | 'lud16Input'
      | 'QRScanner'
      | 'input'
   >('input');
   const [shareTokenData, setShareTokenData] = useState<{
      token?: string;
      txid?: string;
      gift?: GiftAsset;
   } | null>(null);
   const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | undefined>(undefined);
   const [meltQuote, setMeltQuote] = useState<MeltQuoteResponse | undefined>(undefined);
   const [contact, setContact] = useState<PublicContact | undefined>(undefined);
   const [amtUnit, setAmtUnit] = useState<number | undefined>(undefined);
   const [invoice, setInvoice] = useState<string | undefined>(undefined);
   const [gift, setGift] = useState<GiftAsset | undefined>(undefined);
   const [lud16, setLud16] = useState<string | undefined>(undefined);
   const [isProcessing, setIsProcessing] = useState(false);
   const [isGiftMode, setIsGiftMode] = useState(false);

   const { unitToSats, convertToUnit } = useExchangeRate();
   const { payPaymentRequest } = usePaymentRequests();
   const { sendGift, sendEcash } = useWallet();
   const { isMintless } = useMintlessMode();
   const { activeUnit } = useCashuContext();
   const { getMeltQuote } = useCashu();
   const { addToast } = useToast();
   const {
      handleNumpadBackspace,
      numpadValueIsEmpty,
      handleNumpadInput,
      clearNumpadInput,
      numpadAmount,
      numpadValue,
   } = useNumpad({
      activeUnit,
   });

   const resetState = (close = true) => {
      if (close) closeParentComponent();
      setMeltQuote(undefined);
      setCurrentView('input');
      setShareTokenData(null);
      setIsProcessing(false);
      setContact(undefined);
      setAmtUnit(undefined);
      setInvoice(undefined);
      setIsGiftMode(false);
      setLud16(undefined);
      setGift(undefined);
      clearNumpadInput();
   };

   const handleInputSubmit = () => {
      if (!numpadAmount) {
         addToast('Please enter an amount', 'error');
         return;
      }
      setAmtUnit(numpadAmount);

      if (paymentRequest !== undefined) {
         /* user entereed an amountless payment request */
         const newPR = paymentRequest;
         newPR.amount = numpadAmount;
         setPaymentRequest(newPR);
         setCurrentView('confirmPaymentRequest');
         return;
      }

      if (activeInputTab === 'ecash') {
         return handleSendEcash(numpadAmount);
      } else if (activeInputTab === 'lightning') {
         setCurrentView('lud16Input');
      }
   };

   const handleSendEcash = async (amount: number) => {
      if (!amount) {
         addToast('Please enter an amount', 'error');
         return;
      }
      setIsProcessing(true);
      const res = await sendEcash(amount, activeUnit, resetState, gift, contact);
      if (res) {
         setShareTokenData({ token: res.token, txid: res.txid, gift });
         setCurrentView('shareEcash');
      }
      setIsProcessing(false);
   };

   const handleSendGift = async () => {
      if (!gift) {
         addToast('Please select a gift', 'error');
         return;
      }
      setIsProcessing(true);
      const res = await sendGift(gift, resetState, contact);
      if (res) {
         setShareTokenData({ token: res.token, txid: res.txid, gift });
         setCurrentView('shareEcash');
      }
      setIsProcessing(false);
   };

   const handleLud16Submit = async () => {
      if (!lud16) {
         addToast('Please enter a lightning address', 'error');
         return;
      }
      if (!amtUnit) {
         addToast('Please enter an amount', 'error');
         return;
      }
      setIsProcessing(true);
      // TODO: unitToSats should accept cents for usd, not dollars
      const amtSat = await unitToSats(
         activeUnit === Currency.USD ? amtUnit / 100 : amtUnit,
         activeUnit,
      );
      const invoice = await getInvoiceFromLightningAddress(lud16, amtSat * 1000);
      if (!isMintless) {
         const quote = await getMeltQuote(invoice);
         if (!quote) {
            return;
         }
         setMeltQuote(quote);
      }
      setInvoice(invoice);
      setCurrentView('sendLightning');
      setIsProcessing(false);
   };

   const handleSendPaymentRequest = async () => {
      if (!paymentRequest) {
         addToast('Missing payment request', 'error');
         return;
      }
      if (!paymentRequest.amount) {
         addToast('Amountless payment requests are not supported', 'error');
         return;
      }
      setIsProcessing(true);
      const res = await payPaymentRequest(paymentRequest, paymentRequest.amount!).catch(e => {
         const message = e.message || 'Failed to pay payment request';
         addToast(message, 'error');
         resetState();
      });
      setIsProcessing(false);
      if (res) {
         addToast('Payment request paid!', 'success');
         resetState();
      }
   };

   const handlePaste = async (pastedValue: string) => {
      const cleanedValue = pastedValue.toLowerCase().replace('lightning:', '');
      if (cleanedValue.startsWith('lnbc')) {
         setInvoice(cleanedValue);
         if (!isMintless) {
            const quote = await getMeltQuote(cleanedValue);
            if (!quote) {
               return;
            }
            setMeltQuote(quote);
            setAmtUnit(quote.amount);
         } else {
            const amtSat = getAmountFromInvoice(pastedValue);
            const amt = await convertToUnit(amtSat, 'sat', activeUnit);
            setAmtUnit(amt);
         }
         setCurrentView('sendLightning');
         return;
      } else if (pastedValue.startsWith('creqA')) {
         const decoded = decodePaymentRequest(pastedValue);
         if (!decoded.amount) {
            if (numpadValueIsEmpty) {
               setCurrentView('input');
               addToast('Enter an amount to send', 'info');
            } else {
               decoded.amount = Number(numpadValue);
               setCurrentView('confirmPaymentRequest');
            }
         } else {
            setCurrentView('confirmPaymentRequest');
         }
         setPaymentRequest(decoded);
         return;
      } else {
         addToast('Invalid input', 'error');
         return;
      }
   };

   const handleSelectContact = (contact: PublicContact) => {
      setContact(contact);
      if (isGiftMode) {
         setCurrentView('selectGift');
      } else {
         setCurrentView('input');
      }
   };

   const handleUserIconClick = () => {
      if (contact) {
         return setContact(undefined);
      }
      setIsGiftMode(false);
      setCurrentView('selectContact');
   };

   const handleActiveTabChange = (tab: number) => {
      const close = false;
      resetState(close);
      setActiveInputTab(tab === 0 ? 'ecash' : 'lightning');
   };

   return (
      <>
         {(currentView === 'input' || currentView === 'lud16Input') && (
            <>
               <Tabs
                  titleColor='text-black'
                  titles={['ecash', 'lightning']}
                  onActiveTabChange={handleActiveTabChange}
               />

               {currentView === 'input' && (
                  <div className='flex-grow flex flex-col items-center justify-center'>
                     <Amount
                        value={numpadValue}
                        unit={activeUnit}
                        className='font-teko text-6xl font-bold text-black'
                        isDollarAmount={true}
                     />
                     {contact && (
                        <div className='flex justify-center items-center text-gray-500'>
                           to {contact.username}
                        </div>
                     )}
                     {paymentRequest && (
                        <div className='flex justify-center items-center text-gray-500'>
                           to {shortenString(paymentRequest.toEncodedRequest(), 17)}
                        </div>
                     )}
                  </div>
               )}

               {currentView === 'lud16Input' && amtUnit && (
                  <div className='flex-grow flex flex-col items-center justify-start gap-3 mt-6'>
                     <span className='text-xl text-black flex flex-row items-center gap-3'>
                        Sending:
                        <Amount
                           unitClassName='text-3xl text-cyan-teal font-bold'
                           value={amtUnit}
                           unit={activeUnit}
                           className='font-teko text-black text-3xl font-bold'
                        />
                     </span>
                     <TextInput
                        placeholder={`Lightning address`}
                        value={lud16}
                        onChange={e => setLud16(e.target.value)}
                        className='w-full'
                     />
                  </div>
               )}

               <div className='mb-[-1rem]'>
                  <div className='flex justify-between mb-4'>
                     <div className='flex space-x-4'>
                        <PasteButton onPaste={handlePaste} />
                        <button onClick={() => setCurrentView('QRScanner')}>
                           <ScanIcon className='size-8 text-gray-500' />
                        </button>
                        <button onClick={handleUserIconClick}>
                           <UserIcon className='w-6 h-6 text-gray-500' />
                        </button>
                        <button
                           onClick={() => {
                              setIsGiftMode(true);
                              setCurrentView('selectContact');
                           }}
                        >
                           <GiftIcon className='w-6 h-6 text-gray-500' />
                        </button>
                     </div>
                     {isMintless && activeInputTab === 'ecash' ? (
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
                           onClick={currentView === 'input' ? handleInputSubmit : handleLud16Submit}
                           disabled={currentView === 'input' ? numpadValueIsEmpty : !lud16}
                           isProcessing={isProcessing}
                        >
                           Continue
                        </Button>
                     )}
                  </div>
                  {isMobile && currentView === 'input' && (
                     <Numpad
                        onNumberClick={handleNumpadInput}
                        onBackspaceClick={handleNumpadBackspace}
                     />
                  )}
               </div>
            </>
         )}
         {currentView === 'selectContact' && (
            <SelectContact onSelectContact={handleSelectContact} />
         )}
         {currentView === 'selectGift' && (
            <SelectGift
               onSelectGift={g => {
                  setCurrentView('confirmSendGift');
                  setGift(g);
               }}
               contact={contact}
            />
         )}
         {currentView === 'confirmSendGift' && gift !== undefined && (
            <ConfirmSendGift
               {...shareTokenData}
               gift={gift}
               onSendGift={handleSendGift}
               contact={contact}
               sendingGift={isProcessing}
            />
         )}
         {currentView === 'confirmPaymentRequest' && paymentRequest && paymentRequest.amount && (
            <div className='text-black flex flex-col items-center justify-between h-full'>
               <PaymentConfirmationDetails
                  amount={paymentRequest?.amount}
                  unit={(paymentRequest?.unit as Currency) || Currency.SAT}
                  destination={paymentRequest?.toEncodedRequest()}
               />
               <Button
                  className='btn-primary'
                  onClick={handleSendPaymentRequest}
                  isProcessing={isProcessing}
               >
                  Send Payment
               </Button>
            </div>
         )}
         {currentView === 'shareEcash' && (
            <ShareEcash {...shareTokenData} onClose={resetState} contact={contact} />
         )}
         {currentView === 'QRScanner' && <QRScanner onClose={undefined} onScan={handlePaste} />}

         {currentView === 'sendLightning' && invoice && amtUnit && (
            <ConfrimAndSendLightning
               invoice={invoice}
               unit={activeUnit}
               lud16={lud16}
               amount={amtUnit}
               meltQuote={meltQuote}
               onClose={resetState}
            />
         )}
      </>
   );
};

export default SendFlow;
