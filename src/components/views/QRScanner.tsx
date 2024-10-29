import { useRef } from 'react';
import QrReaderComponent from '../utility/QR/QRReader';
import { Button } from 'flowbite-react';
import PasteButton from '../buttons/utility/PasteButton';

interface QRScannerProps {
   onClose?: () => void;
   onScan: (result: string) => void;
}

const QRScanner = ({ onClose, onScan }: QRScannerProps) => {
   const qrReaderRef = useRef<any>(null);

   const handleQRResult = (result: string) => {
      console.log('QR Result:', result);
      onScan(result);
      handleClose();
   };

   const handleClose = () => {
      qrReaderRef.current.stopScanner();
      onClose && onClose();
   };

   return (
      <div className='flex flex-col justify-around space-y-12 h-full min-h-[340px]'>
         <QrReaderComponent ref={qrReaderRef} onDecode={handleQRResult} />
         <div className='flex justify-between'>
            <Button size={'xs'} color={'failure'} onClick={handleClose}>
               Cancel
            </Button>
            <PasteButton onPaste={handleQRResult} />
         </div>
      </div>
   );
};

export default QRScanner;
