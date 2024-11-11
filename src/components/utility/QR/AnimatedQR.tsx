// components/AnimatedQRCode.js

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { UREncoder } from '@gandlaf21/bc-ur';
import { Buffer } from 'buffer';

type FragmentSpeed = 'fast' | 'medium' | 'slow';
type FragmentLength = 'short' | 'medium' | 'long';

const fragmentIntervals: Record<FragmentSpeed, number> = {
   fast: 150,
   medium: 250,
   slow: 500,
};

const fragmentLengths: Record<FragmentLength, number> = {
   short: 50,
   medium: 100,
   long: 150,
};

const AnimatedQRCode: React.FC<{ encodedToken: string }> = ({ encodedToken }) => {
   const [qrCodeFragment, setQrCodeFragment] = useState('');
   const [encoder, setEncoder] = useState<UREncoder | null>(null);
   const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

   const [currentFragmentLength, setCurrentFragmentLength] = useState(fragmentLengths.long);
   const [currentFragmentInterval, setCurrentFragmentInterval] = useState(fragmentIntervals.medium);

   useEffect(() => {
      if (encodedToken.length === 0) {
         return;
      }

      let newIntervalId: NodeJS.Timeout;

      if (typeof window !== 'undefined') {
         import('@gandlaf21/bc-ur').then(module => {
            const messageBuffer = Buffer.from(encodedToken);
            const ur = module.UR.fromBuffer(messageBuffer);
            const initialEncoder = new module.UREncoder(ur, currentFragmentLength, 0);
            setEncoder(initialEncoder);

            newIntervalId = setInterval(() => {
               setQrCodeFragment(initialEncoder.nextPart());
            }, currentFragmentInterval);

            setIntervalId(newIntervalId);
         });
      }

      return () => clearInterval(newIntervalId);
   }, [encodedToken, currentFragmentLength, currentFragmentInterval]);

   const changeSpeed = () => {
      const speeds: FragmentSpeed[] = ['fast', 'medium', 'slow'];
      const currentSpeedIndex = speeds.findIndex(
         speed => fragmentIntervals[speed] === currentFragmentInterval,
      );
      const nextSpeed = speeds[(currentSpeedIndex + 1) % speeds.length];
      setCurrentFragmentInterval(fragmentIntervals[nextSpeed]);
   };

   const changeSize = () => {
      const sizes: FragmentLength[] = ['short', 'medium', 'long'];
      const currentSizeIndex = sizes.findIndex(
         size => fragmentLengths[size] === currentFragmentLength,
      );
      const nextSize = sizes[(currentSizeIndex + 1) % sizes.length];
      setCurrentFragmentLength(fragmentLengths[nextSize]);
   };

   return (
      <div className='text-center'>
         {qrCodeFragment && (
            <div>
               <QRCode value={qrCodeFragment} size={window.innerWidth < 768 ? 275 : 400} />
               {/* <div>
                  <button onClick={changeSpeed}>Change Speed</button>
                  <button onClick={changeSize}>Change Size</button>
               </div> */}
            </div>
         )}
      </div>
   );
};

export default AnimatedQRCode;
