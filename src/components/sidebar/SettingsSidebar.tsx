import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button, Sidebar } from 'flowbite-react';
import MintSidebarItem from './MintSidebarItem';
import AddMintButton from './AddMintButton';

export const SettingsSidebar = () => {
   const [hidden, sethidden] = useState(true);
   const keysets = useSelector((state: RootState) => state.wallet.keysets);

   return (
      <>
         <div className={`${hidden ? '' : hidden}`}>
            <button
               className='fixed right-0 top-0 m-4 p-2 shadow-lg z-10'
               onClick={() => sethidden(!hidden)}
            >
               {hidden ? 'Settings' : 'Hide'}
            </button>
         </div>
         <Sidebar
            aria-label='Settings Sidebar'
            className={`fixed right-0 top-0 h-full min-w-96 bg-gray-100 shadow-lg z-10 ${hidden ? 'hidden' : ''}`}
         >
            <Sidebar.Items>
               <Sidebar.ItemGroup>
                  <Sidebar.Item>
                     <Button color='red' onClick={() => sethidden(true)}>
                        Close
                     </Button>
                  </Sidebar.Item>
                  <Sidebar.Collapse label='Mints'>
                     {Object.keys(keysets).map((id, idx) => (
                        <MintSidebarItem keyset={keysets[id]} key={idx} />
                     ))}
                  </Sidebar.Collapse>
               </Sidebar.ItemGroup>
               <Sidebar.ItemGroup>
                  <AddMintButton />
               </Sidebar.ItemGroup>
            </Sidebar.Items>
         </Sidebar>
      </>
   );
};

export default SettingsSidebar;
