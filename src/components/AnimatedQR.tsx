import { useState, useEffect } from 'react';
import { UR, UREncoder } from '@gandlaf21/bc-ur';
import QRCode from 'qrcode.react';

const AnimatedQRCode = ({ encodedToken }: { encodedToken: string }) => {
   const messageBuffer = Buffer.from(encodedToken); // Directly use the encoded token string
   const ur = UR.fromBuffer(messageBuffer);

   const maxFragmentLength = 200;
   const firstSeqNum = 0;

   const [currentQR, setCurrentQR] = useState('');
   const [encoder, setEncoder] = useState(new UREncoder(ur, maxFragmentLength, firstSeqNum));

   useEffect(() => {
      const timer = setInterval(() => {
         const part = encoder.nextPart();
         if (part) {
            const encoded = encoder.nextPart();
            setCurrentQR(encoded);
         } else {
            clearInterval(timer); // Stop the interval when there are no more parts
         }
      }, 1000); // Update the QR code every second

      return () => clearInterval(timer); // Clean up the interval on component unmount
   }, [encoder]);

   return (
      <div className='App'>
         {currentQR ? <QRCode size={256} value={currentQR} /> : <p>No QR Code available</p>}
      </div>
   );
};

export default AnimatedQRCode;
