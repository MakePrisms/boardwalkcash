// file = Html5QrcodePlugin.jsx
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Html5QrcodeScannerConfig } from 'html5-qrcode/esm/html5-qrcode-scanner';
import { useEffect } from 'react';

const qrcodeRegionId = 'html5qr-code-full-region';

interface Html5QrcodePluginProps {
   fps?: number;
   qrbox?: number;
   aspectRatio?: number;
   disableFlip?: boolean;
   verbose?: boolean;
   qrCodeSuccessCallback: (decodedText: string) => void;
   qrCodeErrorCallback?: (errorMessage: string) => void;
}

// Creates the configuration object for Html5QrcodeScanner.
const createConfig = (props: Html5QrcodePluginProps) => {
   let config: Html5QrcodeScannerConfig = {
      fps: 10,
      // qrbox: 200,
      aspectRatio: 4 / 3,

      // aspectRatio: ,
      disableFlip: false,
   };
   if (props.fps) {
      config.fps = props.fps;
   }
   if (props.qrbox) {
      config.qrbox = props.qrbox;
   }
   if (props.aspectRatio) {
      config.aspectRatio = props.aspectRatio;
   }
   if (props.disableFlip !== undefined) {
      config.disableFlip = props.disableFlip;
   }
   return config;
};

const Html5QrcodePlugin = (props: Html5QrcodePluginProps) => {
   useEffect(() => {
      // when component mounts
      const config = createConfig(props);
      const verbose = props.verbose === true;
      // Suceess callback is required.
      if (!props.qrCodeSuccessCallback) {
         throw 'qrCodeSuccessCallback is required callback.';
      }
      const html5QrcodeScanner = new Html5QrcodeScanner(qrcodeRegionId, config, verbose);

      const onScanSuccess = (decodedText: string) => {
         console.log('## onScanSuccess', decodedText);

         props.qrCodeSuccessCallback(decodedText);
         html5QrcodeScanner.clear().catch(error => {
            console.error('Failed to clear html5QrcodeScanner. ', error);
         });
      };

      html5QrcodeScanner.render(onScanSuccess, props.qrCodeErrorCallback);

      // cleanup function when component will unmount
      return () => {
         html5QrcodeScanner.clear().catch(error => {
            console.error('Failed to clear html5QrcodeScanner. ', error);
         });
      };
   }, []);

   return <div id={qrcodeRegionId} className='text-black' />;
};

export default Html5QrcodePlugin;
