import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { GiftIcon, UserIcon } from '@heroicons/react/20/solid';
import { NumpadControls } from '@/hooks/util/useNumpad';
import ScanIcon from '@/components/icons/ScanIcon';
import Tooltip from '@/components/utility/Tooltip';
import Numpad from '@/components/utility/Numpad';
import PasteButton from '../utility/PasteButton';
import { Button } from 'flowbite-react';
import { Currency } from '@/types';

interface InputOptionsProps {
   disableSendEcash: boolean;
   showNumpad: boolean;
   disableNext: boolean;
   isProcessing: boolean;
   numpad: NumpadControls;
   onNext: () => void;
   onPaste: (text: string) => void;
   onUserIconClick: () => void;
   onScanIconClick: () => void;
   onGiftIconClick: () => void;
}

const InputOptions = ({
   onPaste,
   onUserIconClick,
   onScanIconClick,
   onGiftIconClick,
   onNext,
   disableNext,
   isProcessing,
   showNumpad,
   numpad,
   disableSendEcash,
}: InputOptionsProps) => {
   const { activeUnit } = useCashuContext();
   const { handleNumpadInput, handleNumpadBackspace } = numpad;

   return (
      <div className='mb-[-1rem]'>
         <div className='flex justify-between mb-4'>
            <div className='flex space-x-4'>
               <PasteButton onPaste={onPaste} />
               <button onClick={onScanIconClick}>
                  <ScanIcon className='size-8 text-gray-500' />
               </button>
               <button onClick={onUserIconClick}>
                  <UserIcon className='w-6 h-6 text-gray-500' />
               </button>
               <button onClick={onGiftIconClick}>
                  <GiftIcon className='w-6 h-6 text-gray-500' />
               </button>
            </div>
            {disableSendEcash ? (
               <Tooltip
                  position='left'
                  content='You currently have a Lightning Wallet set as your main account. Select an eCash mint as your main account to generate an eCash request.'
                  className='w-56'
               >
                  <Button className='btn-primary' disabled={true}>
                     Continue
                  </Button>
               </Tooltip>
            ) : (
               <Button
                  className='btn-primary'
                  onClick={onNext}
                  disabled={disableNext}
                  isProcessing={isProcessing}
               >
                  Continue
               </Button>
            )}
         </div>
         {showNumpad && (
            <Numpad
               onNumberClick={handleNumpadInput}
               onBackspaceClick={handleNumpadBackspace}
               showDecimal={activeUnit === Currency.USD}
            />
         )}
      </div>
   );
};

export default InputOptions;
