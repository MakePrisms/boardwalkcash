import { Drawer, Modal } from 'flowbite-react';
import XMarkIcon from '@/components/icons/XMarkIcon';
import { bottomSheetDrawerTheme } from '@/themes/drawerTheme';

interface ViewDrawerOrModalProps {
   isOpen: boolean;
   onClose: () => void;
   title: string;
   isMobile: boolean;
   children: React.ReactNode;
}

const ViewDrawerOrModal = ({
   isOpen,
   onClose,
   title,
   isMobile,
   children,
}: ViewDrawerOrModalProps) => {
   return isMobile ? (
      <div>
         <Drawer
            open={isOpen}
            onClose={onClose}
            position='bottom'
            theme={bottomSheetDrawerTheme}
            className='h-[calc(100%-75px)]'
         >
            <Drawer.Header
               title={title}
               titleIcon={() => null}
               closeIcon={() => <XMarkIcon className='h-8 w-8' />}
            />
            <Drawer.Items key={isOpen.toString()} className='flex flex-col h-full'>
               {children}
            </Drawer.Items>
         </Drawer>
      </div>
   ) : (
      <Modal show={isOpen} onClose={onClose} size={'sm'}>
         <Modal.Header>{title}</Modal.Header>
         <Modal.Body>
            <div
               className='flex flex-col space-y-20 items-stretch justify-center'
               key={isOpen.toString()}
            >
               {children}
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ViewDrawerOrModal;
