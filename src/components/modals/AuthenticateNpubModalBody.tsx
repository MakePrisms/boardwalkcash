import useNostrLogin from '@/hooks/boardwalk/useNostrLogin';
import { useToast } from '@/hooks/util/useToast';
import { setNostrPubkeyAction } from '@/redux/slices/UserSlice';
import { useAppDispatch } from '@/redux/store';
import { HttpResponseError } from '@/utils/appApiRequests';
import { Button, Modal, TextInput } from 'flowbite-react';
import { nip19 } from 'nostr-tools';
import { useState, FormEvent } from 'react';

const AuthenticateNpubModalBody = () => {
   const [showOtpInput, setShowOtpInput] = useState(false);
   const [loading, setLoading] = useState(false);
   const [pubkey, setPubkey] = useState('');
   const [otp, setOtp] = useState('');
   const [pubkeyError, setPubkeyError] = useState('');
   const [otpError, setOtpError] = useState('');
   const { generateAndSendOtp, submitOtp } = useNostrLogin();
   const { addToast } = useToast();
   const dispatch = useAppDispatch();

   const onSubmitPubkey = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validatePubkey(pubkey)) return;

      let hexPubkey = pubkey;
      try {
         if (pubkey.startsWith('npub')) {
            hexPubkey = nip19.decode(pubkey).data as string;
         }
      } catch (error) {
         addToast('Invalid npub', 'error');
         return;
      }
      setLoading(true);
      try {
         await generateAndSendOtp(hexPubkey);
         setShowOtpInput(true);
      } catch (error) {
         if (error instanceof HttpResponseError) {
            addToast(error.message, 'error');
         } else {
            addToast('Error generating OTP', 'error');
         }
         console.error('Error generating OTP:', error);
      } finally {
         setLoading(false);
      }
   };

   const onSubmitOtp = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validateOtp(otp)) return;

      setLoading(true);
      try {
         const { nostrPubkey } = await submitOtp(otp);
         if (nostrPubkey) {
            dispatch(setNostrPubkeyAction(nostrPubkey));
         }
         setOtp('');
         setPubkey('');
         addToast('Successfully authenticated', 'success');
      } catch (error) {
         if (error instanceof HttpResponseError) {
            addToast(error.message, 'error');
         } else {
            addToast('Error verifying OTP', 'error');
         }
         console.error('Error verifying OTP:', error);
      } finally {
         setLoading(false);
      }
   };

   const validatePubkey = (value: string) => {
      if (!value) {
         setPubkeyError('Pubkey is required');
         return false;
      }
      if (!value.startsWith('npub') && value.length !== 64) {
         setPubkeyError('Enter an npub or hex pubkey');
         return false;
      }
      setPubkeyError('');
      return true;
   };

   const validateOtp = (value: string) => {
      if (!value) {
         setOtpError('OTP is required');
         return false;
      }
      if (value.length !== 6 || !/^\d+$/.test(value)) {
         setOtpError('OTP must be 6 digits');
         return false;
      }
      setOtpError('');
      return true;
   };

   return (
      <Modal.Body>
         {!showOtpInput ? (
            <form onSubmit={onSubmitPubkey} className='flex flex-col space-y-6'>
               <TextInput
                  type='text'
                  id='pubkey'
                  placeholder='Enter npub'
                  value={pubkey}
                  onChange={e => setPubkey(e.target.value)}
                  helperText={
                     <>
                        <p>Boardwalk will send you a DM with your one time password</p>
                        <button
                           className='underline cursor-pointer text-xs'
                           onClick={() => setShowOtpInput(true)}
                        >
                           Already have a code?
                        </button>
                     </>
                  }
               />
               {pubkeyError && <p className='text-red-500'>{pubkeyError}</p>}
               <Button isProcessing={loading} type='submit' className='btn-primary'>
                  Send
               </Button>
            </form>
         ) : (
            <form onSubmit={onSubmitOtp} className='flex flex-col space-y-6'>
               <TextInput
                  type='text'
                  id='otp'
                  placeholder='Enter OTP'
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  helperText={'Enter the OTP sent to your npub'}
               />
               {otpError && <p className='text-red-500'>{otpError}</p>}
               <Button isProcessing={loading} type='submit' className='btn-primary'>
                  Verify
               </Button>
            </form>
         )}
      </Modal.Body>
   );
};

export default AuthenticateNpubModalBody;
