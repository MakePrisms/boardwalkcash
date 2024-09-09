import { QrCodeIcon } from '@heroicons/react/20/solid';
import { Button, Modal } from 'flowbite-react';
import { useRef, useState } from 'react';
import QrReaderComponent from '../utility/QRReader';

const QRScannerButton: React.FC<{ onScan: (result: string) => void }> = ({ onScan }) => {
   const [isScannerOpen, setIsScannerOpen] = useState(false);
   const qrReaderRef = useRef<any>(null);

   const handleQRResult = (result: string) => {
      console.log('QR Result:', result);
      setIsScannerOpen(false);
      onScan(result);
   };

   return (
      <>
         <button onClick={() => setIsScannerOpen(true)}>
            <QrCodeIcon className='text-gray-500 size-8 p-0 m-0' />
         </button>
         <Modal show={isScannerOpen} onClose={() => setIsScannerOpen(false)}>
            {/* <Modal.Header>Scan QR Code</Modal.Header>
            <Modal.Body className='h-full'> */}
            <QrReaderComponent ref={qrReaderRef} onDecode={handleQRResult} />
            {/* </Modal.Body> */}
            <Modal.Footer>
               <Button
                  onClick={() => {
                     setIsScannerOpen(false);
                     qrReaderRef.current.stopScanner();
                  }}
               >
                  Close
               </Button>
            </Modal.Footer>
         </Modal>
      </>
   );
};

export default QRScannerButton;
