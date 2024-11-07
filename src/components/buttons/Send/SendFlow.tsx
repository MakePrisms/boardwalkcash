import { decodePaymentRequest, MeltQuoteResponse, PaymentRequest } from '@cashu/cashu-ts';
import ConfirmAndPayPaymentRequest from '@/components/views/ConfirmAndPayPaymentRequest';
import ConfrimAndSendLightning from '@/components/views/ConfirmAndSendLightning';
import { NumpadControls, useNumpad } from '@/hooks/util/useNumpad';
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
import { Button, TextInput } from 'flowbite-react';
import useWallet from '@/hooks/boardwalk/useWallet';
import { shortenString } from '@/utils/formatting';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import { Tabs } from '@/components/utility/Tabs';
import PasteButton from '../utility/PasteButton';
import Numpad from '@/components/utility/Numpad';
import { useState } from 'react';

type ActiveTab = 'ecash' | 'lightning';

type MyState = {
   activeInputTab: ActiveTab;
   isProcessing: boolean;
} & (
   | {
        step: 'input';
        contact?: PublicContact;
        paymentRequest?: PaymentRequest;
     }
   | {
        step: 'lud16Input';
        amount: number;
     }
   | {
        step: 'QRScanner';
     }
   | {
        step: 'sendLightning';
        invoice: string;
        amount: number;
        meltQuote?: MeltQuoteResponse;
        lud16?: string;
     }
   | {
        step: 'shareEcash';
        token?: string;
        txid?: string;
        gift?: GiftAsset;
        contact?: PublicContact;
     }
   | {
        step: 'confirmPaymentRequest';
        paymentRequest: PaymentRequest;
        amount: number;
     }
   | {
        step: 'confirmSendGift';
        gift: GiftAsset;
        contact?: PublicContact;
     }
   | {
        step: 'selectContact';
     }
   | {
        step: 'selectGift';
        contact?: PublicContact;
     }
);

const defaultState: MyState = {
   step: 'input',
   activeInputTab: 'ecash',
   isProcessing: false,
};

interface InputOptionsProps {
   isMintless: boolean;
   activeTab: ActiveTab;
   showNumpad: boolean;
   disableNext: boolean;
   isProcessing: boolean;
   numpad: NumpadControls;
   onNext: any;
   onPaste: (text: string) => void;
   onUserIconClick: () => void;
   onScanIconClick: () => void;
   onGiftIconClick: () => void;
}

const InputOptions = ({
   onPaste,
   onUserIconClick,
   onScanIconClick,
   onGiftIconClick,
   isMintless,
   activeTab,
   onNext,
   disableNext,
   isProcessing,
   showNumpad,
   numpad,
}: InputOptionsProps) => {
   const { activeUnit } = useCashuContext();
   const { handleNumpadInput, handleNumpadBackspace, numpadAmount } = numpad;

   return (
      <div className='mb-[-1rem]'>
         <div className='flex justify-between mb-4'>
            <div className='flex space-x-4'>
               <PasteButton onPaste={onPaste} />
               <button onClick={onScanIconClick}>
                  <ScanIcon className='size-8 text-gray-500' />
               </button>
               <button onClick={onUserIconClick}>
                  <UserIcon className='w-6 h-6 text-gray-500' />
               </button>
               <button onClick={onGiftIconClick}>
                  <GiftIcon className='w-6 h-6 text-gray-500' />
               </button>
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
                  onClick={() => onNext(numpadAmount)}
                  disabled={disableNext}
                  isProcessing={isProcessing}
               >
                  Continue
               </Button>
            )}
         </div>
         {showNumpad && (
            <Numpad
               onNumberClick={handleNumpadInput}
               onBackspaceClick={handleNumpadBackspace}
               showDecimal={activeUnit === Currency.USD}
            />
         )}
      </div>
   );
};

interface InputAmountProps {
   numpad: NumpadControls;
   contact?: PublicContact;
   paymentRequest?: PaymentRequest;
   onActiveTabChange: (tab: number) => void;
   inputOptions: InputOptionsProps;
}

const InputAmount = ({
   numpad,
   contact,
   inputOptions,
   paymentRequest,
   onActiveTabChange,
}: InputAmountProps) => {
   const { activeUnit } = useCashuContext();
   const { numpadValue, numpadValueIsEmpty } = numpad;
   return (
      <>
         <Tabs
            titleColor='text-black'
            titles={['ecash', 'lightning']}
            onActiveTabChange={onActiveTabChange}
         />
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
         <InputOptions {...inputOptions} disableNext={numpadValueIsEmpty} />
      </>
   );
};

interface InputLud16Props {
   amount: number;
   unit: Currency;
   inputOptions: InputOptionsProps;
}

const InputLud16 = ({ amount, unit, inputOptions }: InputLud16Props) => {
   const [lud16, setLud16] = useState('');

   return (
      <div className='w-full flex flex-col  justify-between h-full'>
         <div className='w-full '>
            <span className='text-xl text-black flex flex-row items-center gap-3'>
               Sending:
               <Amount
                  unitClassName='text-3xl text-cyan-teal font-bold'
                  value={amount}
                  unit={unit}
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
         <InputOptions
            {...inputOptions}
            disableNext={lud16.length === 0}
            onNext={() => inputOptions.onNext(lud16, amount, unit)}
         />
      </div>
   );
};

const SendFlow = ({
   isMobile,
   closeParentComponent,
}: {
   isMobile: boolean;
   closeParentComponent: () => void;
}) => {
   const [state, setState] = useState<MyState>(defaultState);
   /* sending ecash as a gift or not */
   const [isGiftMode, setIsGiftMode] = useState(false);

   const { unitToSats, convertToUnit } = useExchangeRate();
   const { sendGift, sendEcash } = useWallet();
   const { isMintless } = useMintlessMode();
   const { activeUnit } = useCashuContext();
   const { getMeltQuote } = useCashu();
   const { addToast } = useToast();
   const showDecimal = activeUnit === Currency.USD;
   const numpad = useNumpad({ showDecimal });
   const { numpadValueIsEmpty, clearNumpadInput, numpadAmount, numpadValue } = numpad;

   const resetState = (close = true) => {
      if (close) closeParentComponent();
      setState(defaultState);
      setIsGiftMode(false);
      clearNumpadInput();
   };

   const handleAmountInputSubmit = (input: number) => {
      if (state.step !== 'input') return;

      if (state.paymentRequest !== undefined) {
         /* user entered an amountless payment request */
         const newPR = state.paymentRequest;
         setState(state => ({
            ...state,
            step: 'confirmPaymentRequest',
            paymentRequest: newPR,
            amount: input,
         }));
         return;
      }

      if (state.activeInputTab === 'ecash') {
         return handleSendEcash(input);
      } else if (state.activeInputTab === 'lightning') {
         setState(state => ({ ...state, step: 'lud16Input', amount: input }));
      }
   };

   const handleSendEcash = async (amount: number) => {
      if (state.step !== 'input') return;
      if (!amount) {
         addToast('Please enter an amount', 'error');
         return;
      }
      setState(state => ({ ...state, isProcessing: true }));
      const res = await sendEcash(amount, activeUnit, resetState, undefined, state.contact);
      if (res) {
         setState(state => ({
            ...state,
            step: 'shareEcash',
            token: res.token,
            txid: res.txid,
         }));
      }
      setState(state => ({ ...state, isProcessing: false }));
   };

   const handleSendGift = async () => {
      if (state.step !== 'confirmSendGift') return;
      setState(state => ({ ...state, isProcessing: true }));
      const res = await sendGift(state.gift, resetState, state.contact);
      const { gift, contact } = state;
      if (res) {
         setState(state => ({
            ...state,
            isProcessing: false,
            step: 'shareEcash',
            token: res.token,
            txid: res.txid,
            contact,
            gift,
         }));
      }
   };

   const handleLud16Submit = async (lud16: string, amount: number, unit: Currency) => {
      setState(state => ({ ...state, isProcessing: true }));
      // TODO: unitToSats should accept cents for usd, not dollars
      const amtSat = await unitToSats(unit === Currency.USD ? amount / 100 : amount, unit);
      try {
         const invoice = await getInvoiceFromLightningAddress(lud16, amtSat * 1000);
         return handleLightningInvoiceInput(invoice, lud16);
      } catch (error) {
         addToast('An error occurred while fetching the invoice.', 'error');
         return resetState();
      } finally {
         setState(state => ({ ...state, isProcessing: false }));
      }
   };

   const handleLightningInvoiceInput = async (invoice: string, lud16?: string) => {
      let quote: MeltQuoteResponse | undefined = undefined;
      let amount: number;
      if (isMintless) {
         /* going to pay directly from lightning wallet */
         const amtSat = getAmountFromInvoice(invoice);
         amount = await convertToUnit(amtSat, 'sat', activeUnit);
      } else {
         quote = await getMeltQuote(invoice);
         if (!quote) {
            return setState({ ...state, isProcessing: false });
         }
         amount = quote.amount;
      }

      return setState(prevState => ({
         ...prevState,
         step: 'sendLightning',
         meltQuote: quote,
         lud16,
         invoice,
         isProcessing: false,
         amount,
      }));
   };

   const handlePaymentRequestInput = async (request: string) => {
      const decoded = decodePaymentRequest(request);
      if (!decoded.amount) {
         if (numpadValueIsEmpty) {
            /* user needs to enter an amount */
            setState({ ...state, step: 'input', paymentRequest: decoded });
            addToast('Enter an amount to send', 'info');
         } else {
            /* user already entered an amount */
            decoded.amount = Number(numpadValue);
            setState({
               ...state,
               step: 'confirmPaymentRequest',
               paymentRequest: decoded,
               amount: Number(numpadValue),
            });
         }
      } else {
         setState({
            ...state,
            step: 'confirmPaymentRequest',
            paymentRequest: decoded,
            amount: decoded.amount,
         });
      }
      return;
   };

   const handlePaste = async (pastedValue: string) => {
      setState(state => ({ ...state, isProcessing: true }));

      const cleanedValue = pastedValue.toLowerCase().replace('lightning:', '');

      if (cleanedValue.startsWith('lnbc')) {
         /* mainnet lightning invoice */
         return handleLightningInvoiceInput(cleanedValue);
      } else if (pastedValue.startsWith('creqA')) {
         /* NUT18 payment request */
         return handlePaymentRequestInput(pastedValue);
      } else {
         return addToast('Invalid input', 'error');
      }
   };

   const handleSelectContact = (contact: PublicContact) => {
      let nextStep: MyState['step'] = 'input';
      if (isGiftMode) {
         nextStep = 'selectGift';
      }
      setState({ ...state, step: nextStep, contact });
   };

   const handleUserIconClick = () => {
      if (state.step === 'input' && state.contact) {
         /* remove contact from state */
         return setState({ ...state, contact: undefined });
      }
      setIsGiftMode(false);
      setState({ ...state, step: 'selectContact' });
   };

   const handleActiveTabChange = (tab: number) => {
      const close = false;
      resetState(close);
      setState({ ...state, activeInputTab: tab === 0 ? 'ecash' : 'lightning' });
   };

   const getInputOptions = (step: 'input' | 'lud16Input') => {
      return {
         isMintless: isMintless,
         numpad: numpad,
         onScanIconClick: () => setState({ ...state, step: 'QRScanner' }),
         onGiftIconClick: () => {
            setIsGiftMode(true);
            setState({ ...state, step: 'selectContact' });
         },
         onUserIconClick: handleUserIconClick,
         onPaste: handlePaste,
         activeTab: state.activeInputTab,
         showNumpad: isMobile && step === 'input',
         disableNext: numpadValueIsEmpty,
         isProcessing: state.isProcessing,
         onNext: step === 'input' ? handleAmountInputSubmit : handleLud16Submit,
      };
   };

   return (
      <>
         {state.step === 'input' && (
            <InputAmount
               numpad={numpad}
               contact={state.contact}
               paymentRequest={state.paymentRequest}
               onActiveTabChange={handleActiveTabChange}
               inputOptions={getInputOptions('input')}
            />
         )}
         {state.step === 'lud16Input' && (
            <InputLud16
               inputOptions={getInputOptions('lud16Input')}
               unit={activeUnit}
               amount={state.amount}
            />
         )}
         {state.step === 'selectContact' && <SelectContact onSelectContact={handleSelectContact} />}
         {state.step === 'selectGift' && (
            <SelectGift
               onSelectGift={g => {
                  setState(state => ({ ...state, step: 'confirmSendGift', gift: g }));
               }}
               contact={state.contact}
            />
         )}
         {state.step === 'confirmSendGift' && (
            <ConfirmSendGift
               gift={state.gift}
               onSendGift={handleSendGift}
               contact={state.contact}
               sendingGift={state.isProcessing}
            />
         )}
         {state.step === 'confirmPaymentRequest' && (
            <ConfirmAndPayPaymentRequest
               paymentRequest={state.paymentRequest}
               requestAmount={state.amount}
               onReset={resetState}
            />
         )}
         {state.step === 'shareEcash' && (
            <ShareEcash
               token={state.token}
               txid={state.txid}
               onClose={resetState}
               contact={state.contact}
               gift={state.gift}
            />
         )}
         {state.step === 'QRScanner' && <QRScanner onClose={undefined} onScan={handlePaste} />}

         {state.step === 'sendLightning' && (
            <ConfrimAndSendLightning
               invoice={state.invoice}
               unit={activeUnit}
               lud16={state.lud16}
               amount={state.amount}
               meltQuote={state.meltQuote}
               onClose={resetState}
            />
         )}
      </>
   );
};

export default SendFlow;
