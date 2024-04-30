import { Modal, Spinner } from 'flowbite-react';

interface ProcessingSwapModalProps {
   isSwapping: boolean;
}

const ProcessingSwapModal = ({ isSwapping }: ProcessingSwapModalProps) => {
   return (
      <Modal show={isSwapping}>
         <Modal.Header>
            <h2>Swapping...</h2>
         </Modal.Header>
         <Modal.Body>
            <div className='flex flex-col justify-center items-center'>
               <div className='mb-5'>
                  <Spinner size='xl' />
               </div>
               <div>
                  <p className='text-black text-center'>
                     This can take up to 20 seconds. Please wait while we swap your tokens.
                  </p>
               </div>
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ProcessingSwapModal;
