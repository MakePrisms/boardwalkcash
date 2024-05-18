/* eslint-disable react/display-name */
// pages/QrReaderComponent.tsx

import React, {
   useEffect,
   useRef,
   useState,
   useCallback,
   forwardRef,
   useImperativeHandle,
} from 'react';
import QrScanner from 'qr-scanner';
import { URDecoder } from '@gandlaf21/bc-ur';

const QrReaderComponent = forwardRef(
   ({ onDecode }: { onDecode: (decodedText: string) => void }, ref) => {
      const videoRef = useRef<HTMLVideoElement>(null);
      const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
      const urDecoder = useRef<URDecoder | null>(null);
      const [urDecoderProgress, setUrDecoderProgress] = useState<number>(0);

      useEffect(() => {
         if (videoRef.current) {
            const qrScannerInstance = new QrScanner(
               videoRef.current,
               (result: QrScanner.ScanResult) => handleResult(result),
               {
                  returnDetailedScanResult: true,
                  highlightScanRegion: true,
                  highlightCodeOutline: true,
                  onDecodeError: () => {},
               },
            );
            if (typeof window !== undefined) {
               import('@gandlaf21/bc-ur').then(module => {
                  urDecoder.current = new module.URDecoder();
               });
            }
            qrScannerInstance.start();
            setQrScanner(qrScannerInstance);

            return () => {
               console.log('Destroying QR scanner');
               qrScannerInstance.stop();
               qrScannerInstance.destroy();
            };
         }
      }, [videoRef]);

      useImperativeHandle(ref, () => ({
         stopScanner: () => {
            qrScanner?.stop();
         },
      }));

      const handleResult = useCallback(
         (result: QrScanner.ScanResult) => {
            if (result.data.toLowerCase().startsWith('ur:')) {
               if (!urDecoder.current) return;
               urDecoder.current.receivePart(result.data);
               setUrDecoderProgress(urDecoder.current.estimatedPercentComplete() || 0);

               if (urDecoder.current.isComplete() && urDecoder.current.isSuccess()) {
                  const ur = urDecoder.current.resultUR();
                  const decoded = ur.decodeCBOR();
                  onDecode(decoded.toString());
                  qrScanner?.stop();
                  setUrDecoderProgress(0);
               }
            } else {
               onDecode(result.data);
               qrScanner?.stop();
            }
         },
         [qrScanner, onDecode, urDecoder],
      );

      const pasteToParseDialog = useCallback(() => {
         if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
               onDecode(text);
            });
         }
      }, [onDecode]);

      const canPasteFromClipboard =
         typeof window !== 'undefined' &&
         window.isSecureContext &&
         navigator.clipboard &&
         navigator.clipboard.readText;

      return (
         <div className='bg-white shadow rounded p-4'>
            <div className='text-center'>
               <div>
                  <video ref={videoRef} className='w-full'></video>
               </div>
               <div>
                  <div className='flex justify-center mt-4'>
                     {urDecoderProgress > 0 && (
                        <div className='w-full bg-gray-500 rounded h-8 relative'>
                           <div
                              className='bg-secondary h-8 rounded'
                              style={{ width: `${urDecoderProgress * 100}%` }}
                           ></div>
                           <div className='absolute inset-0 flex justify-center items-center'>
                              <span className='text-white font-bold'>
                                 {Math.round(urDecoderProgress * 100) +
                                    '%' +
                                    (urDecoderProgress > 0.9 ? ' - Keep scanning' : '')}
                              </span>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      );
   },
);

export default QrReaderComponent;
