import { useState } from 'react';
import { useToast } from '@/hooks/util/useToast';
import { Button } from 'flowbite-react';
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from '@heroicons/react/20/solid';

interface Props {
   toCopy: string;
   toShow: string;
   onClick?: () => void;
   className?: string;
}

const ClipboardButton: React.FC<Props> = ({ toCopy, toShow, onClick, className = '' }) => {
   const [isCopied, setIsCopied] = useState(false);

   const { addToast } = useToast();

   const handleCopy = () => {
      navigator.clipboard
         .writeText(toCopy)
         .then(() => {
            setIsCopied(true);
            addToast('Copied to clipboard', 'info');

            setTimeout(() => {
               setIsCopied(false);
            }, 5000);
         })
         .catch((err): void => {
            console.error('Copy failed', err);
            addToast('Failed to copy to clipboard', 'error');
         });

      if (onClick) {
         onClick();
      }
   };

   return (
      <Button onClick={handleCopy} className={className}>
         <>
            <div className='flex flex-row content-center justify-center align-middle'>
               {toShow}
               &nbsp;
               {isCopied ? (
                  <ClipboardDocumentCheckIcon className='w-5 h-5' />
               ) : (
                  <ClipboardDocumentIcon className='w-5 h-5' />
               )}
            </div>
         </>
      </Button>
   );
};

export default ClipboardButton;
