import { WaitForLightningInvoicePayment } from '@/components/views/WaitForLightningInvoicePayment';
import ViewReusablePaymentRequest from '@/components/views/ViewReusablePaymentRequest';
import { Currency, GetPaymentRequestResponse, LightningTipResponse } from '@/types';
import ConfirmEcashReceive from '@/components/views/ConfirmEcashReceive';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import WaitForEcashPayment from '../../views/WaitForEcashPayment';
import { getInvoiceForLNReceive } from '@/utils/appApiRequests';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import Amount from '@/components/utility/amounts/Amount';
import { getDecodedToken, Token } from '@cashu/cashu-ts';
import { QrCodeIcon } from '@heroicons/react/20/solid';
import ScanIcon from '@/components/icons/ScanIcon';
import QRScanner from '@/components/views/QRScanner';
import Tooltip from '@/components/utility/Tooltip';
import { useNumpad } from '@/hooks/util/useNumpad';
import PasteButton from '../utility/PasteButton';
import Numpad from '@/components/utility/Numpad';
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
   const [token, setToken] = useState<Token | null>(null);
   const [fetchingInvoice, setFetchingInvoice] = useState(false);
   const [activeTab, setActiveTab] = useState<'ecash' | 'lightning'>('ecash');
   const [fetchingPaymentRequest, setFetchingPaymentRequest] = useState(false);
   const [invoiceData, setInvoiceData] = useState<LightningTipResponse | null>(null);
   const [currentView, setCurrentView] = useState<
      | 'input'
      | 'invoice'
      | 'paymentRequest'
      | 'receiveEcash'
      | 'QRScanner'
      | 'reusablePaymentRequest'
   >('input');
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
            setToken(decoded);
            setCurrentView('receiveEcash');
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
      } else if (activeTab === 'lightning') {
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

   return (
      <>
         {currentView === 'input' && (
            <>
               <Tabs
                  titleColor='text-black'
                  titles={['ecash', 'lightning']}
                  onActiveTabChange={tab => setActiveTab(tab === 0 ? 'ecash' : 'lightning')}
               />

               <div className='flex-grow flex flex-col items-center justify-center'>
                  <Amount
                     value={numpadValue}
                     unit={activeUnit}
                     className='font-teko text-6xl font-bold text-black'
                     isDollarAmount={true}
                  />
               </div>

               <div className='mb-8'>
                  <div className='flex justify-between mb-4'>
                     <div className='flex space-x-4'>
                        <PasteButton onPaste={setPastedValue} />
                        <button onClick={() => setCurrentView('QRScanner')}>
                           <ScanIcon className='size-8 text-gray-500' />
                        </button>
                        <button onClick={() => setCurrentView('reusablePaymentRequest')}>
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
               onSuccess={resetState}
            />
         )}
         {currentView === 'paymentRequest' && paymentRequestData && (
            <WaitForEcashPayment request={paymentRequestData} onSuccess={resetState} />
         )}
         {currentView === 'receiveEcash' && token && (
            <ConfirmEcashReceive token={token} onSuccess={resetState} onFail={resetState} />
         )}
         {currentView === 'QRScanner' && (
            <QRScanner onClose={() => setCurrentView('input')} onScan={setPastedValue} />
         )}
         {currentView === 'reusablePaymentRequest' && <ViewReusablePaymentRequest />}
      </>
   );
};

export default ReceiveButtonContent;
