import ProcessingModal from './ProcessingModal';

interface ProcessingSwapModalProps {
   isSwapping: boolean;
}

const ProcessingSwapModal = ({ isSwapping }: ProcessingSwapModalProps) => {
   return (
      <ProcessingModal
         isSwapping={isSwapping}
         title='Transferring'
         prompt='Please wait while we transfer your tokens.'
      />
   );
};

export default ProcessingSwapModal;
