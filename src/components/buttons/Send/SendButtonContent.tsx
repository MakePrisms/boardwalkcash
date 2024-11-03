import { decodePaymentRequest, MeltQuoteResponse, PaymentRequest } from '@cashu/cashu-ts';
import PaymentConfirmationDetails from '@/components/views/PaymentConfirmationDetails';
import ConfrimAndSendLightning from '@/components/views/ConfirmAndSendLightning';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import useNotifications from '@/hooks/boardwalk/useNotifications';
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
import { postTokenToDb } from '@/utils/appApiRequests';
import SelectGift from '@/components/views/SelectGift';
import { getAmountFromInvoice } from '@/utils/bolt11';
import QRScanner from '@/components/views/QRScanner';
import ScanIcon from '@/components/icons/ScanIcon';
import Tooltip from '@/components/utility/Tooltip';
import { useNumpad } from '@/hooks/util/useNumpad';
import { Button, TextInput } from 'flowbite-react';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import { Tabs } from '@/components/utility/Tabs';
import PasteButton from '../utility/PasteButton';
import Numpad from '@/components/utility/Numpad';
import { formatUnit } from '@/utils/formatting';
import { useState } from 'react';

const SendButtonContent = ({
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
   const [meltQuote, setMeltQuote] = useState<MeltQuoteResponse | undefined>(undefined);
   const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | undefined>(undefined);
   const [contact, setContact] = useState<PublicContact | undefined>(undefined);
   const [amtUnit, setAmtUnit] = useState<number | undefined>(undefined);
   const [invoice, setInvoice] = useState<string | undefined>(undefined);
   const [gift, setGift] = useState<GiftAsset | undefined>(undefined);
   const [lud16, setLud16] = useState<string | undefined>(undefined);
   const [isGiftMode, setIsGiftMode] = useState(false);

   const { isMintless, createMintlessToken, sendToMintlessUser } = useMintlessMode();
   const { createSendableToken, getMeltQuote } = useCashu();
   const { unitToSats, convertToUnit } = useExchangeRate();
   const { sendTokenAsNotification } = useNotifications();
   const { payPaymentRequest } = usePaymentRequests();
   const { activeUnit } = useCashuContext();
   const { addToast } = useToast();
   const {
      handleNumpadBackspace,
      numpadValueIsEmpty,
      handleNumpadInput,
      clearNumpadInput,
      numpadValue,
   } = useNumpad({
      activeUnit,
   });

   const resetState = (close = true) => {
      if (close) closeParentComponent();
      setMeltQuote(undefined);
      setCurrentView('input');
      setShareTokenData(null);
      setContact(undefined);
      setAmtUnit(undefined);
      setInvoice(undefined);
      setIsGiftMode(false);
      setLud16(undefined);
      setGift(undefined);
      clearNumpadInput();
   };

   const handleInputSubmit = (value: string) => {
      const parsedAmount = parseFloat(value);
      if (isNaN(parsedAmount)) {
         addToast('Invalid amount', 'error');
         return;
      }
      const amtUnit = activeUnit === Currency.USD ? parsedAmount * 100 : parsedAmount;
      setAmtUnit(amtUnit);
      if (activeInputTab === 'ecash') {
         return handleSendEcash(amtUnit, activeUnit, gift);
      } else if (activeInputTab === 'lightning') {
         setCurrentView('lud16Input');
      }
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
      const res = await payPaymentRequest(paymentRequest, paymentRequest.amount!).catch(e => {
         const message = e.message || 'Failed to pay payment request';
         addToast(message, 'error');
      });
      if (res) {
         addToast('Payment request paid!', 'success');
         resetState();
      }
   };

   const handleSendEcash = async (amount: number, unit: Currency, gift?: GiftAsset) => {
      setCurrentView;
      let token: string | undefined;
      try {
         if (isMintless && !contact?.mintlessReceive) {
            /* if we are making a lightning payment to a user with a mint */
            if (!contact) {
               addToast('You can only send eTips and eGifts from a Lightning Wallet.', 'error');
               throw new Error('You can only send eTips and eGifts from a Lightning Wallet.');
            }
            if (unit !== 'sat') {
               throw new Error('mintless only supports sat');
            }

            token = await createMintlessToken(Math.round(amount), unit, contact);
         } else if (contact?.mintlessReceive) {
            /* user wants to receive to their lud16 */
            if (!contact.lud16) {
               addToast('Contact does not have a lightning address', 'error');
               return;
            }

            const transaction = await sendToMintlessUser(amount, activeUnit, contact);
            resetState();
         } else {
            /* regular send */
            console.log('creating token for ', amount);
            token = await createSendableToken(amount, {
               pubkey: contact ? `02${contact.pubkey}` : undefined,
               gift: gift?.name,
               feeCents: gift?.fee,
            });
         }

         if (!token) {
            throw new Error('Failed to create ecash token');
         }

         let txid: string | undefined;
         if (contact) {
            await sendTokenAsNotification(token);
            txid = await postTokenToDb(token);
         }

         setShareTokenData({ token, txid, gift });
         setCurrentView('shareEcash');
      } catch (e: any) {
         console.error(e);
         // resetState();
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
            addToast('Does not support amountless payment requests', 'error');
            return;
         }
         setPaymentRequest(decoded);
         setCurrentView('confirmPaymentRequest');
         return;
      } else {
         addToast('Invalid input', 'error');
         return;
      }
   };

   const handleSendGift = async () => {
      if (!gift) {
         addToast('Please select a gift', 'error');
         return;
      }
      try {
         if (gift?.campaingId) {
            throw new Error('Gift campaigns not implemented');
            // if (!selectedContact) throw new Error('No contact selected');
            // const { token } = await sendCampaignGift(gift, selectedContact?.pubkey).catch(e => {
            //    const errMsg = e.message || 'Failed to send eGift';
            //    addToast(errMsg, 'error');
            //    setSending(false);
            //    return { token: null };
            // });
            // if (token) {
            //    addToast(`eGift sent to ${selectedContact?.username}`, 'success');
            //    setToken(token);
            //    setCurrentStep(GiftStep.ShareGift);
            // }
            // setSending(false);
            // return;
         }
         // else if (useInvoice) {
         //    handleLightningTip(amountUnit, gift?.fee);
         //    return;
         // }
         let sendableToken: string | undefined;
         if (isMintless && !contact?.mintlessReceive) {
            if (!contact) {
               throw new Error('No contact selected');
            }

            sendableToken = await createMintlessToken(gift.amount, activeUnit, contact, gift?.name);
         } else if (contact?.mintlessReceive) {
            await sendToMintlessUser(gift.amount, activeUnit, contact, gift?.name);

            addToast(`eGift sent`, 'success');
            resetState();
         } else {
            sendableToken = await createSendableToken(gift.amount, {
               pubkey: contact ? `02${contact.pubkey}` : undefined,
               gift: gift?.name,
               feeCents: gift?.fee,
            });
         }

         if (!sendableToken) {
            /* this error case is handled in useCashu */
            return;
         }

         let txid: string | undefined;
         if (contact) {
            txid = await postTokenToDb(sendableToken, gift?.name);
            await sendTokenAsNotification(sendableToken, txid);
         }

         addToast(
            `eGift sent (${formatUnit(gift.amount + (gift?.fee || 0), activeUnit)})`,
            'success',
         );
         setShareTokenData({ token: sendableToken, txid, gift });
         setCurrentView('shareEcash');
      } catch (error: any) {
         console.error('Error sending token:', error);
         const msg = error.message || 'Failed to send token';
         addToast(msg, 'error');
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
                  </div>
               )}

               {currentView === 'lud16Input' && amtUnit && (
                  <div className='flex-grow flex flex-col items-center justify-start gap-3'>
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

               <div className='mb-8'>
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
                           onClick={
                              currentView === 'input'
                                 ? () => handleInputSubmit(numpadValue)
                                 : handleLud16Submit
                           }
                           disabled={currentView === 'input' ? numpadValueIsEmpty : !lud16}
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
            />
         )}
         {currentView === 'confirmPaymentRequest' && paymentRequest && paymentRequest.amount && (
            <div className='text-black flex flex-col justify-between h-full'>
               <PaymentConfirmationDetails
                  amount={paymentRequest?.amount}
                  unit={(paymentRequest?.unit as Currency) || Currency.SAT}
                  destination={paymentRequest?.toEncodedRequest()}
               />
               <Button className='btn-primary w-full' onClick={handleSendPaymentRequest}>
                  Send Payment
               </Button>
            </div>
         )}
         {currentView === 'shareEcash' && (
            <ShareEcash {...shareTokenData} onClose={resetState} contact={contact} />
         )}
         {currentView === 'QRScanner' && (
            <QRScanner onClose={() => setCurrentView('input')} onScan={handlePaste} />
         )}

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

export default SendButtonContent;
