import { Button, Popover } from 'flowbite-react';

interface SwapToMainButtonProps {
   swapToMainOpen: boolean;
   mintUrl: string;
   className?: string;
   setSwapToMainOpen: (value: boolean) => void;
   handleSwapToMain: () => void;
   isToMainMint?: boolean;
}

const SwapToMainButton = ({
   swapToMainOpen,
   mintUrl,
   setSwapToMainOpen,
   handleSwapToMain,
   className,
   isToMainMint = false,
}: SwapToMainButtonProps) => (
   <Popover
      open={swapToMainOpen}
      content={
         <div className='w-80 text-sm text-gray-400'>
            <div className='border-b border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-600 dark:bg-gray-700'>
               <h3 id='swap-popover' className='font-semibold text-gray-900 dark:text-white'>
                  Transfer to Main
               </h3>
            </div>
            <div className='px-3 py-2'>
               <p className='whitespace-break-spaces break-words'>
                  Transfer all the funds from {mintUrl} to the main mint?
               </p>
            </div>
            <div className='flex justify-around mb-3 mr-3'>
               <Button onClick={() => setSwapToMainOpen(false)} color='failure'>
                  Cancel
               </Button>
               <Button onClick={handleSwapToMain} color='success'>
                  Confirm
               </Button>
            </div>
         </div>
      }
   >
      <button
         onClick={() => setSwapToMainOpen(true)}
         className={`${className && className} mr-3 underline`}
      >
         {isToMainMint ? 'Claim' : 'Transfer to Main'}
      </button>
   </Popover>
);

export default SwapToMainButton;
