import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/util/useToast';
import { Button } from 'flowbite-react';
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from '@heroicons/react/20/solid';

interface Props {
   toCopy: string;
   toShow: string;
   onClick?: () => void;
   className?: string;
   size?: 'xs' | 'sm' | 'md' | 'lg';
   btnId?: string;
}

const ClipboardButton: React.FC<Props> = ({
   toCopy,
   toShow,
   onClick,
   className = '',
   size = 'md',
   btnId,
}) => {
   const [isCopied, setIsCopied] = useState(false);

   const { addToast } = useToast();

   const handleCopy = useCallback(() => {
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
   }, [toCopy]);

   return (
      <Button onClick={handleCopy} className={`${className} !p-0`} size={size} id={btnId}>
         <div className='flex items-center justify-center w-full h-full space-x-1'>
            <span>{toShow}</span>
            {isCopied ? (
               <ClipboardDocumentCheckIcon className='w-4 h-4' />
            ) : (
               <ClipboardDocumentIcon className='w-4 h-4' />
            )}
         </div>
      </Button>
   );
};

export default ClipboardButton;
