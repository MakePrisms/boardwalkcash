import { Modal, Spinner } from 'flowbite-react';

interface ProcessingModalProps {
   isSwapping: boolean;
   title: string;
   prompt: string;
}

const ProcessingModal = ({ isSwapping, title, prompt }: ProcessingModalProps) => {
   return (
      <Modal show={isSwapping}>
         <Modal.Header>
            <h2>{title}...</h2>
         </Modal.Header>
         <Modal.Body>
            <div className='flex flex-col justify-center items-center'>
               <div className='mb-5'>
                  <Spinner size='xl' />
               </div>
               <div>
                  <p className='text-black text-center'>This can take up to 20 seconds. {prompt}</p>
               </div>
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ProcessingModal;
