import { Drawer, Modal } from 'flowbite-react';
import XMarkIcon from '@/components/icons/XMarkIcon';
import { bottomSheetDrawerTheme } from '@/themes/drawerTheme';
import { MobileView, BrowserView } from 'react-device-detect';

interface ViewDrawerOrModalProps {
   isOpen: boolean;
   onClose: () => void;
   title: string;
   children: React.ReactNode;
}

const ViewDrawerOrModal = ({ isOpen, onClose, title, children }: ViewDrawerOrModalProps) => {
   return (
      <>
         <MobileView>
            <div>
               <Drawer
                  open={isOpen}
                  onClose={onClose}
                  position='bottom'
                  theme={bottomSheetDrawerTheme}
                  className='h-[calc(100%-75px)] rounded-t-xl overflow-hidden'
               >
                  <Drawer.Header
                     title={title}
                     titleIcon={() => null}
                     closeIcon={() => <XMarkIcon className='h-8 w-8' />}
                  />
                  <Drawer.Items key={isOpen.toString()} className='flex flex-col h-full mb-12'>
                     {children}
                  </Drawer.Items>
               </Drawer>
            </div>
         </MobileView>
         <BrowserView>
            <Modal show={isOpen} onClose={onClose} size={'sm'} style={{ outline: 'none' }}>
               <Modal.Header>{title}</Modal.Header>
               <Modal.Body>
                  <div
                     className='flex flex-col h-[450px] max-h-screen  space-y-20 items-stretch'
                     key={isOpen.toString()}
                  >
                     {children}
                  </div>
               </Modal.Body>
            </Modal>
         </BrowserView>
      </>
   );
};

export default ViewDrawerOrModal;
