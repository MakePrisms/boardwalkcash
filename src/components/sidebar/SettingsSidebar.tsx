import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Drawer, Modal } from 'flowbite-react';
import MintSidebarItem from './Mints/MintSidebarItem';
import AddMintButton from './Mints/AddMintButton';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { customDrawerTheme } from '@/themes/drawerTheme';
import DrawerCollapse from '../DrawerCollapse';
import { BookOpenIcon, BuildingLibraryIcon, UserIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { BanknoteIcon } from '../EcashTapButton';
import EcashTapsSettings from './Taps/EcashTapsSettings';
import ProfileSettings from './Profile/ProfileSetting';
import ContactsDropdown from './Contacts/ContactsDropdown';

const SettingsCog = () => (
   <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={1.2}
      stroke='currentColor'
      className='w-6 h-6'
   >
      <path
         strokeLinecap='round'
         strokeLinejoin='round'
         d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z'
      />
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' />
   </svg>
);

export const SettingsSidebar = () => {
   const [hidden, setHidden] = useState(true);
   const keysets = useSelector((state: RootState) => state.wallet.keysets);
   const nwcState = useSelector((state: RootState) => state.nwc);
   const [nwcUri, setNwcUri] = useState('');

   return (
      <>
         <div className={`${hidden ? '' : hidden}`}>
            <button className='fixed right-0 top-0 m-4 p-2 z-10' onClick={() => setHidden(!hidden)}>
               {hidden && <SettingsCog />}
            </button>
         </div>
         <Drawer
            open={!hidden}
            onClose={() => setHidden(true)}
            edge={false}
            position='right'
            className='md:min-w-fit  min-w-full bg-[#0f1f41ff] text-white flex flex-col'
            theme={customDrawerTheme}
         >
            <Drawer.Header
               title='Settings'
               titleIcon={() => null}
               className='drawer-header'
               closeIcon={() => <XMarkIcon className='h-8 w-8' />}
            />
            <Drawer.Items className='md:w-96 max-w-screen-sm'>
               <div className='flex align-middle items-center justify-around '></div>

               <div className='  space-y-2 border-b pt-4 first:mt-0 first:border-b-0 first:pt-0 border-gray-300'>
                  <DrawerCollapse label='Mints' icon={<BuildingLibraryIcon className='size-4' />}>
                     <div className='text-lg mb-2'></div>
                     {Object.keys(keysets).map((id, idx) => (
                        <MintSidebarItem keyset={keysets[id]} key={idx} />
                     ))}
                     <div className='mt-4 space-y-2 border-t pt-4 first:mt-0 first:border-t-0 first:pt-0 border-gray-300'>
                        <AddMintButton keysets={keysets} />
                     </div>
                  </DrawerCollapse>
               </div>
               {/* <div className='mt-1 space-y-3 border-b pt-4 first:mt-0 first:border-b-0 first:pt-0 border-gray-300'>
                  <DrawerCollapse label='Connections' icon={<LinkIcon className='size-4' />}>
                     {nwcState.allPubkeys.map((pubkey, idx) => (
                        <NwcSidebarItem connection={nwcState.connections[pubkey]} key={idx} />
                     ))}
                     <div className=' space-y-2 border-t pt-4 first:mt-0 first:border-t-0 first:pt-0 border-gray-300'>
                        <AddConnectionButton
                           keysets={keysets}
                           nwcUri={nwcUri}
                           setNwcUri={setNwcUri}
                        />
                     </div>
                  </DrawerCollapse>
               </div> */}
               <div className='mt-1 space-y-3 border-b pt-4 first:mt-0 first:border-b-0 first:pt-0 border-gray-300'>
                  <DrawerCollapse label={'Profile'} icon={<UserIcon className='size-4' />}>
                     <ProfileSettings />
                  </DrawerCollapse>
               </div>
               <div className='mt-1 space-y-3 border-b pt-4 first:mt-0 first:border-b-0 first:pt-0 border-gray-300'>
                  <DrawerCollapse label='Contacts' icon={<BookOpenIcon className='size-4' />}>
                     <ContactsDropdown />
                  </DrawerCollapse>
               </div>
               <div className='mb-12 mt-1 space-y-3  pt-4 first:mt-0 first:pt-0 '>
                  <DrawerCollapse label='Cash Taps' icon={<BanknoteIcon className='size-4' />}>
                     <EcashTapsSettings />
                  </DrawerCollapse>
               </div>
            </Drawer.Items>
         </Drawer>
         <Modal show={nwcUri ? true : false} onClose={() => setNwcUri('')} className='text-black'>
            <Modal.Header>New Wallet Connection</Modal.Header>
            <Modal.Body className='flex flex-col space-y-3'>
               <p className='text-md mb-2'>
                  Paste your connection into any app that supports NWC to enable sending from your
                  Boardwalk Cash wallet. Currently, funds will only be sent from your main mint.
               </p>
               <ClipboardButton className='self-end' toCopy={nwcUri} toShow={'Copy Connection'} />
            </Modal.Body>
         </Modal>
      </>
   );
};

export default SettingsSidebar;
