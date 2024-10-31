import { ArrowDownRightIcon } from '@heroicons/react/20/solid';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import ReceiveButtonContent from './ReceiveButtonContent';
import { Button, Drawer, Modal } from 'flowbite-react';
import XMarkIcon from '@/components/icons/XMarkIcon';
import React, { useState } from 'react';

const ReceiveButton = ({ isMobile }: { isMobile: boolean }) => {
   const [showButtonContent, setShowButtonContent] = useState(false);
   const { activeUnit } = useCashuContext();

   // const handlePaymentSuccess = (amountUsdCents: number, wallet: Wallet, quote: string) => {
   //    handleModalClose();
   //    addToast('Payment received!', 'success');
   //    dispatch(
   //       addTransaction({
   //          type: 'lightning',
   //          transaction: {
   //             amount: amountUsdCents,
   //             date: new Date().toLocaleString(),
   //             status: TxStatus.PAID,
   //             mint: wallet.url,
   //             quote,
   //             unit: activeUnit,
   //          },
   //       }),
   //    );
   // };

   const handleModalClose = () => {
      setShowButtonContent(false);
   };

   return (
      <>
         <Button onClick={() => setShowButtonContent(true)} className='btn-primary'>
            <span className='text-lg'>Receive</span>{' '}
            <ArrowDownRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         {isMobile ? (
            <div>
               <Drawer
                  open={showButtonContent}
                  onClose={handleModalClose}
                  position='bottom'
                  className='h-[90vh] md:h-5/6'
               >
                  <Drawer.Header
                     title={activeUnit === 'usd' ? 'Receive $' : 'Receive Bitcoin'}
                     titleIcon={() => null}
                     closeIcon={() => <XMarkIcon className='h-8 w-8' />}
                  />
                  <Drawer.Items className='flex flex-col h-[78vh]'>
                     {showButtonContent && (
                        <ReceiveButtonContent
                           isMobile={isMobile}
                           closeParentComponent={handleModalClose}
                        />
                     )}
                  </Drawer.Items>
               </Drawer>
            </div>
         ) : (
            <Modal show={showButtonContent} onClose={handleModalClose} size={'sm'}>
               <Modal.Header>{activeUnit === 'usd' ? 'Receive $' : 'Receive Bitcoin'}</Modal.Header>
               <Modal.Body>
                  <div className='flex flex-col space-y-20 items-stretch justify-center'>
                     {showButtonContent && (
                        <ReceiveButtonContent
                           isMobile={isMobile}
                           closeParentComponent={handleModalClose}
                        />
                     )}
                  </div>
               </Modal.Body>
            </Modal>
         )}
      </>
   );
};

export default ReceiveButton;
