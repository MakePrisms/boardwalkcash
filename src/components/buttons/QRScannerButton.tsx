import { Button, Modal } from 'flowbite-react';
import { useRef, useState } from 'react';
import QrReaderComponent from '../utility/QR/QRReader';
import ScanIcon from '../icons/ScanIcon';

const QRScannerButton: React.FC<{
   onScan: (result: string) => void;
   btnText?: string;
   onClick?: () => void;
   onClose?: () => void;
}> = ({ onScan, btnText, onClick, onClose }) => {
   const [isScannerOpen, setIsScannerOpen] = useState(false);
   const qrReaderRef = useRef<any>(null);

   const handleQRResult = (result: string) => {
      console.log('QR Result:', result);
      setIsScannerOpen(false);
      onScan(result);
   };

   const handleBtnClick = () => {
      onClick?.();
      setIsScannerOpen(true);
   };

   const handleClose = () => {
      setIsScannerOpen(false);
      qrReaderRef.current.stopScanner();
      onClose?.();
   };

   return (
      <>
         {btnText ? (
            <Button className='btn-primary' onClick={handleBtnClick}>
               {btnText}
            </Button>
         ) : (
            <button onClick={handleBtnClick}>
               <ScanIcon className='text-gray-500 size-8' />
            </button>
         )}
         <Modal show={isScannerOpen} onClose={handleClose}>
            <Modal.Header>Scan QR Code</Modal.Header>
            {/* <Modal.Header>Scan QR Code</Modal.Header>
            <Modal.Body className='h-full'> */}
            <QrReaderComponent ref={qrReaderRef} onDecode={handleQRResult} />
            {/* </Modal.Body> */}
         </Modal>
      </>
   );
};

export default QRScannerButton;
