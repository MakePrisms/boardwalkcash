import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Modal, Sidebar } from 'flowbite-react';
import MintSidebarItem from './MintSidebarItem';
import AddMintButton from './AddMintButton';
import NwcSidebarItem from './NwcSidebarItem';
import AddConnectionButton from './AddConnectionButton';
import ClipboardButton from '../buttons/utility/ClipboardButton';

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

const XMark = () => (
   <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='black'
      className='w-6 h-6'
   >
      <path strokeLinecap='round' strokeLinejoin='round' d='M6 18 18 6M6 6l12 12' />
   </svg>
);

export const SettingsSidebar = () => {
   const [hidden, sethidden] = useState(true);
   const keysets = useSelector((state: RootState) => state.wallet.keysets);
   const nwcState = useSelector((state: RootState) => state.nwc);
   const [nwcUri, setNwcUri] = useState('');

   return (
      <>
         <div className={`${hidden ? '' : hidden}`}>
            <button className='fixed right-0 top-0 m-4 p-2 z-10' onClick={() => sethidden(!hidden)}>
               {hidden && <SettingsCog />}
            </button>
         </div>
         <Sidebar
            aria-label='Settings Sidebar'
            className={`fixed right-0 top-0 h-full w-full md:w-96 max-w-screen-sm bg-[#0f1f41ff] shadow-lg z-10 ${hidden ? 'hidden' : ''}`}
         >
            <button className='hover:cursor-pointer p-3' onClick={() => sethidden(true)}>
               <XMark />
            </button>
            <div className='flex align-middle items-center justify-around'>
               <Sidebar.Logo
                  className='text-black'
                  href='#'
                  img='/favicon.ico'
                  imgAlt='Boardwalkcash logo'
               >
                  Boardwalk Cash
               </Sidebar.Logo>
            </div>
            <Sidebar.Items>
               <Sidebar.ItemGroup>
                  <Sidebar.Collapse className='text-lg' label='Mints'>
                     {Object.keys(keysets).map((id, idx) => (
                        <MintSidebarItem keyset={keysets[id]} key={idx} />
                     ))}
                     <Sidebar.ItemGroup>
                        <AddMintButton keysets={keysets} />
                     </Sidebar.ItemGroup>
                  </Sidebar.Collapse>
               </Sidebar.ItemGroup>
               <Sidebar.ItemGroup>
                  <Sidebar.Collapse className='text-lg' label='Connections'>
                     {nwcState.allPubkeys.map((pubkey, idx) => (
                        <NwcSidebarItem connection={nwcState.connections[pubkey]} key={idx} />
                     ))}
                     <Sidebar.ItemGroup>
                        <AddConnectionButton
                           keysets={keysets}
                           nwcUri={nwcUri}
                           setNwcUri={setNwcUri}
                        />
                     </Sidebar.ItemGroup>
                  </Sidebar.Collapse>
               </Sidebar.ItemGroup>
            </Sidebar.Items>
         </Sidebar>
         <Modal show={nwcUri ? true : false} onClose={() => setNwcUri('')}>
            <Modal.Header>New Wallet Connection</Modal.Header>
            <Modal.Body className='flex flex-col space-y-3'>
               <p className='text-black text-md mb-2'>
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
