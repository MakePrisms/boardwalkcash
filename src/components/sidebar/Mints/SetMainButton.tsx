import { Wallet } from '@/types';
import { Button, Popover } from 'flowbite-react';

interface SetMainButtonProps {
   keyset: Wallet;
   setSetMainOpen: (value: boolean) => void;
   setMainOpen: boolean;
   handleSetMain: () => void;
}

const SetMainButton = ({
   keyset,
   setMainOpen,
   setSetMainOpen,
   handleSetMain,
}: SetMainButtonProps) => (
   <Popover
      open={setMainOpen}
      content={
         <div className='w-80 text-sm text-gray-400'>
            <div className='border-b border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-600 dark:bg-gray-700'>
               <h3 id='set-main-popover' className='font-semibold text-gray-900 dark:text-white'>
                  Set Main
               </h3>
            </div>
            <div className='px-3 py-2 mb-3'>
               <p className='whitespace-break-spaces break-words'>
                  {`Set ${keyset.url} as main sending and receiving account?`}
               </p>
            </div>
            <div className='flex justify-around mb-3 mr-3'>
               <Button onClick={() => setSetMainOpen(false)} color='failure'>
                  Cancel
               </Button>
               <Button onClick={handleSetMain} className='btn-primary'>
                  Confirm
               </Button>
            </div>
         </div>
      }
   >
      <button onClick={() => setSetMainOpen(true)} className='text-xs underline mr-3'>
         Set Main
      </button>
   </Popover>
);

export default SetMainButton;
