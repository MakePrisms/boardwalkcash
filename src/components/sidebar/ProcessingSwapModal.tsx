import { Modal, Spinner } from 'flowbite-react';

const ProcessingSwapModal = ({ isSwapping }: { isSwapping: boolean }) => {
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
                     This can take up to 20 seconds. Please wait while we swap your balance to your
                     main mint.
                  </p>
               </div>
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ProcessingSwapModal;
