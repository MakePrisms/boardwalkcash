import { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';

function splitData(data: string, chunkSize: number) {
   const numChunks = Math.ceil(data.length / chunkSize);
   let chunks = [];

   for (let i = 0, o = 0; i < numChunks; ++i, o += chunkSize) {
      chunks.push(data.substr(o, chunkSize));
   }

   return chunks;
}

const AnimatedMultiQRCode = ({ text, chunkSize = 250 }: { text: string; chunkSize?: number }) => {
   const chunks = splitData(text, chunkSize);
   const [currentPart, setCurrentPart] = useState(0);

   useEffect(() => {
      const interval = setInterval(() => {
         setCurrentPart(prevPart => (prevPart + 1) % chunks.length);
      }, 700);

      return () => clearInterval(interval);
   }, [chunks.length]);

   return (
      <div>
         <QRCode value={chunks[currentPart]} size={256} level='H' includeMargin={true} />
      </div>
   );
};
export default AnimatedMultiQRCode;

// import { useState, useEffect } from 'react';
// import cborg from 'cborg';
// const { UR, UREncoder } = require('@gandlaf21/bc-ur');
// import QRCode from 'qrcode.react';

// const AnimatedQRCode = ({ encodedToken }: { encodedToken: string }) => {
//    const messageBuffer = Buffer.from(encodedToken); // Directly use the encoded token string
//    const ur = UR.fromBuffer(messageBuffer);

//    const maxFragmentLength = 200;
//    const firstSeqNum = 0;

//    const [currentQR, setCurrentQR] = useState('');
//    const [encoder, setEncoder] = useState(new UREncoder(ur, maxFragmentLength, firstSeqNum));

//    useEffect(() => {
//       const timer = setInterval(() => {
//          const part = encoder.nextPart();
//          if (part) {
//             const encoded = encoder.nextPart();
//             setCurrentQR(encoded);
//          } else {
//             clearInterval(timer); // Stop the interval when there are no more parts
//          }
//       }, 1000); // Update the QR code every second

//       return () => clearInterval(timer); // Clean up the interval on component unmount
//    }, [encoder]);

//    return (
//       <div className='App'>
//          {currentQR ? <QRCode size={256} value={currentQR} /> : <p>No QR Code available</p>}
//       </div>
//    );
// };

// export default AnimatedQRCode;
