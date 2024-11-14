import { WaitForLightningInvoicePayment } from '@/components/views/WaitForLightningInvoicePayment';
import ViewReusablePaymentRequest from '@/components/views/ViewReusablePaymentRequest';
import { Currency, GetPaymentRequestResponse, LightningTipResponse } from '@/types';
import ConfirmEcashReceive from '@/components/views/ConfirmEcashReceive';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { NumpadControls, useNumpad } from '@/hooks/util/useNumpad';
import WaitForEcashPayment from '../../views/WaitForEcashPayment';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import Amount from '@/components/utility/amounts/Amount';
import { getDecodedToken, Token } from '@cashu/cashu-ts';
import { QrCodeIcon } from '@heroicons/react/20/solid';
import ScanIcon from '@/components/icons/ScanIcon';
import QRScanner from '@/components/views/QRScanner';
import Tooltip from '@/components/utility/Tooltip';
import PasteButton from '../utility/PasteButton';
import Numpad from '@/components/utility/Numpad';
import { Tabs } from '@/components/utility/Tabs';
import { useToast } from '@/hooks/util/useToast';
import { getTokenFromUrl } from '@/utils/cashu';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button } from 'flowbite-react';
import { isMobile } from 'react-device-detect';
import { useState } from 'react';
import useWallet from '@/hooks/boardwalk/useWallet';

type ActiveTab = 'ecash' | 'lightning';

type MyState = {
   activeTab: ActiveTab;
   isProcessing: boolean;
} & (
   | {
        step: 'input';
     }
   | {
        step: 'invoice';
        invoiceData: LightningTipResponse;
     }
   | {
        step: 'paymentRequest';
        paymentRequestData: GetPaymentRequestResponse;
     }
   | {
        step: 'receiveEcash';
        token: Token;
     }
   | {
        step: 'QRScanner';
     }
   | {
        step: 'reusablePaymentRequest';
     }
);

const defaultState: MyState = { step: 'input', activeTab: 'ecash', isProcessing: false };

const tabs: Array<{ title: string; value: ActiveTab; index: number }> = [
   { title: 'ecash', value: 'ecash', index: 0 },
   { title: 'lightning', value: 'lightning', index: 1 },
];

interface ReceiveInputProps {
   activeTab: ActiveTab;
   isMintless: boolean;
   isProcessing: boolean;
   numpad: NumpadControls;
   onActiveTabChange: (tab: ActiveTab) => void;
   onPaste: (text: string) => void;
   onScan: () => void;
   onReusableEcashPaymentRequest: () => void;
   onNext: (value: string) => void;
}

const ReceiveInput = ({
   activeTab,
   isMintless,
   isProcessing,
   numpad,
   onActiveTabChange,
   onPaste,
   onScan,
   onReusableEcashPaymentRequest,
   onNext,
}: ReceiveInputProps) => {
   const { activeUnit } = useCashuContext();
   const { numpadValue, numpadValueIsEmpty, handleNumpadInput, handleNumpadBackspace } = numpad;

   return (
      <>
         <Tabs
            titleColor='text-black'
            titles={tabs.map(x => x.title)}
            onChange={index => onActiveTabChange(tabs[index].value)}
            value={tabs.findIndex(x => x.value === activeTab)}
         />

         <div className='flex-grow flex flex-col items-center justify-center'>
            <Amount
               value={numpadValue}
               unit={activeUnit}
               className='font-teko text-6xl font-bold text-black'
               isDollarAmount={true}
            />
         </div>

         <div className='mb-[-1rem]'>
            <div className='flex justify-between mb-4'>
               <div className='flex space-x-4'>
                  <PasteButton onPaste={onPaste} />
                  <button onClick={onScan}>
                     <ScanIcon className='size-8 text-gray-500' />
                  </button>
                  <button onClick={onReusableEcashPaymentRequest}>
                     <QrCodeIcon className='size-8 text-gray-500' />
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
                     onClick={() => onNext(numpadValue)}
                     disabled={numpadValueIsEmpty}
                     isProcessing={isProcessing}
                  >
                     Continue
                  </Button>
               )}
            </div>
            {isMobile && (
               <Numpad
                  onNumberClick={handleNumpadInput}
                  onBackspaceClick={handleNumpadBackspace}
                  showDecimal={activeUnit === Currency.USD}
               />
            )}
         </div>
      </>
   );
};

interface ReceiveFlowProps {
   onClose: () => void;
}

const ReceiveFlow = ({ onClose }: ReceiveFlowProps) => {
   const [state, setState] = useState<MyState>(defaultState);

   const { addToast } = useToast();
   const { isMintless } = useMintlessMode();
   const { fetchPaymentRequest } = usePaymentRequests();
   const { activeUnit, activeKeysetId } = useCashuContext();
   const userPubkey = useSelector((state: RootState) => state.user.pubkey);
   const { generateInvoice } = useWallet();

   const showDecimal = activeUnit === Currency.USD;
   const numpad = useNumpad({ showDecimal });

   const handlePaste = async (pastedValue: string) => {
      const handleTokenInput = async () => {
         let decoded: Token | null = null;
         const encoded = pastedValue.includes('http')
            ? await getTokenFromUrl(pastedValue)
            : pastedValue;
         if (encoded) {
            try {
               decoded = getDecodedToken(encoded);
            } catch (e) {
               addToast('Invalid token', 'error');
            }
         }
         if (decoded) {
            setState({ ...state, step: 'receiveEcash', token: decoded });
         }
      };

      if (!pastedValue) return;

      if (pastedValue.includes('http') || pastedValue.includes('cashu')) {
         handleTokenInput();
      } else if (!isNaN(parseFloat(pastedValue))) {
         handleInputAmount(pastedValue);
      } else {
         addToast('Invalid input', 'error');
      }
   };

   const handleInputAmount = async (input: string) => {
      const parsedAmount = parseFloat(input);
      if (isNaN(parsedAmount)) {
         return;
      }
      const amountUnit = activeUnit === Currency.USD ? parsedAmount * 100 : parsedAmount;
      if (state.activeTab === 'ecash') {
         return handlePaymentRequest(amountUnit);
      } else if (state.activeTab === 'lightning') {
         return handleReceiveLightningPayment(amountUnit);
      }
   };

   const handleReceiveLightningPayment = async (amountUnit: number) => {
      setState(state => ({ ...state, isProcessing: true }));

      try {
         if (isMintless) {
         } else {
            if (!activeKeysetId || !userPubkey) {
               throw new Error('No active keyset or pubkey set');
            }
            const res = await generateInvoice(amountUnit);
            setState(state => ({ ...state, step: 'invoice', invoiceData: res }));
         }
      } catch (e) {
         addToast('Failed to fetch invoice', 'error');
         onClose();
         return;
      } finally {
         setState(state => ({ ...state, isProcessing: false }));
      }
   };

   const handlePaymentRequest = async (amountUnit: number) => {
      setState(state => ({ ...state, isProcessing: true }));
      try {
         const req = await fetchPaymentRequest(amountUnit, false);
         setState(state => ({ ...state, step: 'paymentRequest', paymentRequestData: req }));
      } catch (e) {
         addToast('Failed to fetch payment request', 'error');
         onClose();
         return;
      } finally {
         setState(state => ({ ...state, isProcessing: false }));
      }
   };

   return (
      <div className='flex flex-col justify-between h-full'>
         {state.step === 'input' && (
            <ReceiveInput
               activeTab={state.activeTab}
               isMintless={isMintless}
               isProcessing={state.isProcessing}
               onActiveTabChange={tab => setState(prevState => ({ ...prevState, activeTab: tab }))}
               onPaste={handlePaste}
               onScan={() => setState(prevState => ({ ...prevState, step: 'QRScanner' }))}
               onReusableEcashPaymentRequest={() =>
                  setState(prevState => ({ ...prevState, step: 'reusablePaymentRequest' }))
               }
               numpad={numpad}
               onNext={handleInputAmount}
            />
         )}
         {state.step === 'invoice' && (
            <WaitForLightningInvoicePayment
               invoice={state.invoiceData?.invoice}
               checkingId={state.invoiceData?.checkingId}
               onSuccess={onClose}
            />
         )}
         {state.step === 'paymentRequest' && (
            <WaitForEcashPayment request={state.paymentRequestData} onSuccess={onClose} />
         )}
         {state.step === 'receiveEcash' && (
            <ConfirmEcashReceive token={state.token} onSuccess={onClose} onFail={onClose} />
         )}
         {state.step === 'QRScanner' && (
            <QRScanner onCancel={() => setState(defaultState)} onScan={handlePaste} />
         )}
         {state.step === 'reusablePaymentRequest' && <ViewReusablePaymentRequest />}
      </div>
   );
};

export default ReceiveFlow;
