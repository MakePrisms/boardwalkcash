import { useRef } from 'react';
import QrReaderComponent from '../utility/QR/QRReader';
import { Button } from 'flowbite-react';
import PasteButton from '../buttons/utility/PasteButton';

interface QRScannerProps {
   onCancel?: () => void;
   onScan: (result: string) => void;
}

const QRScanner = ({ onCancel, onScan }: QRScannerProps) => {
   const qrReaderRef = useRef<any>(null);

   const handleQRResult = (result: string) => {
      console.log('QR Result:', result);
      stopScanner();
      onScan(result);
   };

   const handleCancel = () => {
      stopScanner();
      onCancel?.();
   };

   const stopScanner = () => {
      qrReaderRef.current.stopScanner();
   };

   return (
      <div className='flex flex-col justify-between h-full min-h-[340px]'>
         <QrReaderComponent ref={qrReaderRef} onDecode={handleQRResult} />
         <div className='flex justify-between'>
            <Button size={'xs'} color={'failure'} onClick={handleCancel}>
               Cancel
            </Button>
            <PasteButton onPaste={handleQRResult} />
         </div>
      </div>
   );
};

export default QRScanner;
