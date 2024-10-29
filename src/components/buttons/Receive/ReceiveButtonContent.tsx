import { WaitForLightningInvoicePayment } from '@/components/views/WaitForLightningInvoicePayment';
import { Currency, GetPaymentRequestResponse, LightningTipResponse } from '@/types';
import ToggleCurrencyDropdown from '@/components/ToggleCurrencyDropdown';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { getInvoiceForLNReceive } from '@/utils/appApiRequests';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import PaymentRequestQRButton from '../PaymentRequestQRButton';
import { getDecodedToken, Token } from '@cashu/cashu-ts';
import WaitForEcashPayment from '../../views/WaitForEcashPayment';
import Tooltip from '@/components/utility/Toolttip';
import { useNumpad } from '@/hooks/util/useNumpad';
import PasteButton from '../utility/PasteButton';
import Amount from '@/components/utility/amounts/Amount';
import Numpad from '@/components/utility/Numpad';
import QRScannerButton from '../QRScannerButton';
import { Tabs } from '@/components/utility/Tabs';
import { useToast } from '@/hooks/util/useToast';
import { getTokenFromUrl } from '@/utils/cashu';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button } from 'flowbite-react';

interface ReceiveButtonContentProps {
   closeParentComponent: () => void;
   isMobile: boolean;
}

const ReceiveButtonContent = ({ isMobile, closeParentComponent }: ReceiveButtonContentProps) => {
   const [pastedValue, setPastedValue] = useState('');
   const [fetchingInvoice, setFetchingInvoice] = useState(false);
   const [activeTab, setActiveTab] = useState<'ecash' | 'bitcoin'>('ecash');
   const [fetchingPaymentRequest, setFetchingPaymentRequest] = useState(false);
   const [invoiceData, setInvoiceData] = useState<LightningTipResponse | null>(null);
   const [currentView, setCurrentView] = useState<'input' | 'invoice' | 'paymentRequest'>('input');
   const [paymentRequestData, setPaymentRequestData] = useState<GetPaymentRequestResponse | null>(
      null,
   );

   const { addToast } = useToast();
   const { isMintless } = useMintlessMode();
   const { fetchPaymentRequest } = usePaymentRequests();
   const { activeUnit, activeKeysetId } = useCashuContext();
   const userPubkey = useSelector((state: RootState) => state.user.pubkey);
   const {
      numpadValue,
      numpadValueIsEmpty,
      handleNumpadInput,
      handleNumpadBackspace,
      clearNumpadInput,
   } = useNumpad({
      activeUnit,
   });

   const resetState = () => {
      setFetchingPaymentRequest(false);
      setPaymentRequestData(null);
      setFetchingInvoice(false);
      setCurrentView('input');
      closeParentComponent();
      setActiveTab('ecash');
      setInvoiceData(null);
      setPastedValue('');
      clearNumpadInput();
   };

   useEffect(() => {
      const handleTokenInput = async () => {
         let decoded: Token | undefined = undefined;
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
            console.log('decoded', decoded);
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
   }, [pastedValue]);

   const handleInputAmount = async (input: string) => {
      const parsedAmount = parseFloat(input);
      if (isNaN(parsedAmount)) {
         return;
      }
      const amountUnit = activeUnit === Currency.USD ? parsedAmount * 100 : parsedAmount;
      if (activeTab === 'ecash') {
         return handlePaymentRequest(amountUnit);
      } else if (activeTab === 'bitcoin') {
         return handleReceiveLightningPayment(amountUnit);
      }
   };

   const handleReceiveLightningPayment = async (amountUnit: number) => {
      setFetchingInvoice(true);
      try {
         if (isMintless) {
         } else {
            if (!activeKeysetId || !userPubkey) {
               throw new Error('No active keyset or pubkey set');
            }
            const res = await getInvoiceForLNReceive(userPubkey, amountUnit, activeKeysetId);
            setInvoiceData(res);
            setCurrentView('invoice');
         }
      } catch (e) {
         addToast('Failed to fetch invoice', 'error');
         resetState();
         return;
      } finally {
         setFetchingInvoice(false);
      }
   };

   const handlePaymentRequest = async (amountUnit: number) => {
      setFetchingPaymentRequest(true);
      try {
         const req = await fetchPaymentRequest(amountUnit, false);
         setPaymentRequestData(req);
         setCurrentView('paymentRequest');
      } catch (e) {
         addToast('Failed to fetch payment request', 'error');
         resetState();
         return;
      } finally {
         setFetchingPaymentRequest(false);
      }
   };

   const handlePaymentRequestSuccess = (token: string) => {
      addToast('Payment received! Check your notifications for the token', 'success');
      resetState();
   };

   const handleLightningPaymentSuccess = (amount: number) => {
      addToast('Payment received!', 'success');
      resetState();
   };

   return (
      <>
         {currentView === 'input' && (
            <>
               <Tabs
                  titleColor='text-black'
                  titles={['ecash', 'bitcoin']}
                  onActiveTabChange={tab => setActiveTab(tab === 0 ? 'ecash' : 'bitcoin')}
               />

               <div className='flex-grow flex flex-col items-center justify-center'>
                  <Amount
                     value={numpadValue}
                     unit={activeUnit}
                     className='font-teko text-6xl font-bold text-black'
                     isDollarAmount={true}
                  />
                  <ToggleCurrencyDropdown className='text-black mt-2' />
               </div>

               <div className='mb-8'>
                  <div className='flex justify-between mb-4'>
                     <div className='flex space-x-4'>
                        <PasteButton onPaste={setPastedValue} />
                        <QRScannerButton onScan={setPastedValue} />
                        <PaymentRequestQRButton />
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
                           onClick={() => handleInputAmount(numpadValue)}
                           disabled={numpadValueIsEmpty}
                           isProcessing={
                              activeTab === 'ecash' ? fetchingPaymentRequest : fetchingInvoice
                           }
                        >
                           Continue
                        </Button>
                     )}
                  </div>
                  {isMobile && (
                     <Numpad
                        onNumberClick={handleNumpadInput}
                        onBackspaceClick={handleNumpadBackspace}
                     />
                  )}
               </div>
            </>
         )}
         {currentView === 'invoice' && invoiceData && (
            <WaitForLightningInvoicePayment
               invoice={invoiceData?.invoice}
               checkingId={invoiceData?.checkingId}
               onSuccess={handleLightningPaymentSuccess}
            />
         )}
         {currentView === 'paymentRequest' && paymentRequestData && (
            <WaitForEcashPayment
               request={paymentRequestData}
               onSuccess={handlePaymentRequestSuccess}
            />
         )}
      </>
   );
};

export default ReceiveButtonContent;