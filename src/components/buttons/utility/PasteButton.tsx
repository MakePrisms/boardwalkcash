import { ClipboardDocumentIcon } from '@heroicons/react/20/solid';
import { useToast } from '@/hooks/util/useToast';

interface Props {
   onPaste: (text: string) => void;
   className?: string;
}

const PasteButton = ({ onPaste, className = '' }: Props) => {
   const { addToast } = useToast();

   const handlePaste = async () => {
      try {
         const text = await navigator.clipboard.readText();
         if (!text) {
            addToast('Clipboard is empty', 'error');
            return;
         }
         onPaste(text);
      } catch (err) {
         console.error('Failed to read clipboard', err);
         addToast('Failed to read from clipboard', 'error');
      }
   };

   return (
      <button onClick={handlePaste} className={className}>
         <ClipboardDocumentIcon className='size-8 text-gray-500' />
      </button>
   );
};

export default PasteButton;
