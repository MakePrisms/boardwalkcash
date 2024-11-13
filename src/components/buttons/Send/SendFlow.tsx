import { decodePaymentRequest, MeltQuoteResponse, PaymentRequest } from '@cashu/cashu-ts';
import ConfirmAndPayPaymentRequest from '@/components/views/ConfirmAndPayPaymentRequest';
import ConfrimAndSendLightning from '@/components/views/ConfirmAndSendLightning';
import ConfirmSendGift from '@/components/views/ConfirmSendGift';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { getInvoiceFromLightningAddress } from '@/utils/lud16';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { Currency, GiftAsset, PublicContact } from '@/types';
import SelectContact from '@/components/views/SelectContact';
import ShareEcash from '@/components/views/ShareEcash';
import SelectGift from '@/components/views/SelectGift';
import { getAmountFromInvoice } from '@/utils/bolt11';
import QRScanner from '@/components/views/QRScanner';
import useWallet from '@/hooks/boardwalk/useWallet';
import { useNumpad } from '@/hooks/util/useNumpad';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import InputOptions from './InputOptions';
import AmountInput from './AmountInput';
import InputLud16 from './Lud16Input';
import { useState } from 'react';

type ActiveTab = 'ecash' | 'lightning';

type SendFlowState = {
   isProcessing: boolean;
   isGiftMode: boolean;
} & (
   | {
        activeTab: ActiveTab;
        step: 'input';
        contact?: PublicContact;
        paymentRequest?: PaymentRequest;
     }
   | {
        step: 'lud16Input';
        amount: number;
        lud16: string;
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

const defaultState: SendFlowState = {
   step: 'input',
   activeTab: 'ecash',
   isProcessing: false,
   isGiftMode: false,
};

interface SendFlowProps {
   isMobile: boolean;
   onClose: () => void;
}

const SendFlow = ({ isMobile, onClose }: SendFlowProps) => {
   const [state, setState] = useState<SendFlowState>(defaultState);

   const { unitToSats, convertToUnit } = useExchangeRate();
   const { sendGift, sendEcash } = useWallet();
   const { isMintless } = useMintlessMode();
   const { activeUnit } = useCashuContext();
   const { getMeltQuote } = useCashu();
   const { addToast } = useToast();
   const showDecimal = activeUnit === Currency.USD;
   const numpad = useNumpad({ showDecimal });
   const { numpadValueIsEmpty, clearNumpadInput, numpadValue, numpadAmount } = numpad;

   const handleAmountInputSubmit = (input: number) => {
      if (state.step !== 'input') return;

      const paymentRequest = state.paymentRequest;
      if (paymentRequest !== undefined) {
         /* user entered an amountless payment request */
         setState(state => ({
            ...state,
            step: 'confirmPaymentRequest',
            paymentRequest,
            amount: input,
         }));
      } else if (state.activeTab === 'ecash') {
         return handleSendEcash(input);
      } else if (state.activeTab === 'lightning') {
         setState(state => ({ ...state, step: 'lud16Input', amount: input, lud16: '' }));
      }
   };

   const handleSendEcash = async (amount: number) => {
      if (state.step !== 'input') return;
      if (!amount) {
         addToast('Please enter an amount', 'error');
         return;
      }
      setState(state => ({ ...state, isProcessing: true }));
      const res = await sendEcash(amount, activeUnit, onClose, undefined, state.contact);
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
      const res = await sendGift(state.gift, onClose, state.contact);
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
         return onClose();
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
            setState({ ...state, step: 'input', paymentRequest: decoded, activeTab: 'ecash' });
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
      if (state.isGiftMode) {
         setState({ ...state, step: 'selectGift', contact });
      } else {
         setState({ ...state, step: 'input', contact, activeTab: 'ecash' });
      }
   };

   const handleUserIconClick = () => {
      if (state.step === 'input' && state.contact) {
         /* remove contact from state */
         return setState({ ...state, contact: undefined });
      }
      setState({ ...state, isGiftMode: false, step: 'selectContact' });
   };

   const handleActiveTabChange = (tab: number) => {
      if (state.step !== 'input') return;
      setState({ ...state, isGiftMode: false, activeTab: tab === 0 ? 'ecash' : 'lightning' });
      clearNumpadInput();
   };

   const commonInputOptions = {
      numpad,
      onScanIconClick: () => setState({ ...state, step: 'QRScanner' }),
      onGiftIconClick: () => {
         setState({ ...state, step: 'selectContact', isGiftMode: true });
      },
      onUserIconClick: handleUserIconClick,
      onPaste: handlePaste,
      isProcessing: state.isProcessing,
   };

   return (
      <div className='flex flex-col justify-between h-full'>
         {state.step === 'input' && (
            <AmountInput
               numpad={numpad}
               contact={state.contact}
               paymentRequest={state.paymentRequest}
               onActiveTabChange={handleActiveTabChange}
               activeTab={state.activeTab}
            >
               <InputOptions
                  {...commonInputOptions}
                  disableSendEcash={isMintless && state.activeTab === 'ecash'}
                  showNumpad={isMobile}
                  disableNext={numpadValueIsEmpty}
                  onNext={() => handleAmountInputSubmit(numpadAmount)}
               />
            </AmountInput>
         )}
         {state.step === 'lud16Input' && (
            <InputLud16
               unit={activeUnit}
               amount={state.amount}
               value={state.lud16}
               onChange={e => setState(state => ({ ...state, lud16: e.target.value }))}
            >
               <InputOptions
                  {...commonInputOptions}
                  disableSendEcash={false} // sending lightning, this does not apply
                  showNumpad={false}
                  disableNext={numpadValueIsEmpty}
                  onNext={() => handleLud16Submit(state.lud16, state.amount, activeUnit)}
               />
            </InputLud16>
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
               onClose={onClose}
            />
         )}
         {state.step === 'shareEcash' && (
            <ShareEcash
               token={state.token}
               txid={state.txid}
               onClose={onClose}
               contact={state.contact}
               gift={state.gift}
            />
         )}
         {state.step === 'QRScanner' && (
            <QRScanner onCancel={() => setState(defaultState)} onScan={handlePaste} />
         )}

         {state.step === 'sendLightning' && (
            <ConfrimAndSendLightning
               invoice={state.invoice}
               unit={activeUnit}
               lud16={state.lud16}
               amount={state.amount}
               meltQuote={state.meltQuote}
               onClose={onClose}
            />
         )}
      </div>
   );
};

export default SendFlow;
