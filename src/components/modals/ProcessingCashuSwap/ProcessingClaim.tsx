import ProcessingModal from './ProcessingModal';

interface ProcessingClaimModalProps {
   isSwapping: boolean;
}

const ProcessingClaimModal = ({ isSwapping }: ProcessingClaimModalProps) => {
   return (
      <ProcessingModal
         isSwapping={isSwapping}
         title='Claiming'
         prompt='Please wait while we claim your tokens.'
      />
   );
};

export default ProcessingClaimModal;
